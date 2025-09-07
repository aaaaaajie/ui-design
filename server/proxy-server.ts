import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(express.json({ limit: '5mb' }));

// 允许来自本地 Vite 开发端口的请求
app.use(cors({ origin: true }));

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// 请求转发接口
app.post('/proxy/request', async (req, res) => {
  const {
    method = 'get',
    url,
    headers = {},
    params,
    data,
    timeout = 30000,
    responseType,
  } = (req.body || {}) as {
    method?: string;
    url: string;
    headers?: Record<string, string>;
    params?: any;
    data?: any;
    timeout?: number;
    responseType?: 'json' | 'text' | 'arraybuffer' | 'stream';
  };

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: true, message: 'Invalid url' });
  }

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: true, message: 'Unsupported protocol' });
    }
  } catch {
    return res.status(400).json({ error: true, message: 'Invalid url' });
  }

  try {
    const axRes = await axios.request({
      method: method as any,
      url,
      headers,
      params,
      data,
      timeout,
      responseType: (responseType as any) || 'json',
      // 不抛错，统一由响应体返回 status
      validateStatus: () => true,
    });

    // 直接透传响应数据和头信息
    return res.json({
      status: axRes.status,
      statusText: axRes.statusText,
      headers: axRes.headers,
      data: axRes.data,
    });
  } catch (err: any) {
    return res.status(200).json({
      error: true,
      message: err?.message || 'Proxy request failed',
    });
  }
});

// =============== 条件转换器 ===============
// 将字符串中的 {{ token }} 占位符替换为对应值
function replacePlaceholders(str: string, resolver: (token: string) => string): string {
  return str.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_m, tokenRaw) => {
    const token = String(tokenRaw || '').trim();
    return resolver(token);
  });
}

// 深度遍历对象，将形如 "{{ token }}" 的字符串替换为变量值
function deepResolvePlaceholders(input: any, resolver: (token: string) => string): any {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
      return replacePlaceholders(input, resolver);
    }
    return input;
  }
  if (Array.isArray(input)) return input.map(v => deepResolvePlaceholders(v, resolver));
  if (input && typeof input === 'object') {
    const out: any = Array.isArray(input) ? [] : {};
    for (const k of Object.keys(input)) {
      out[k] = deepResolvePlaceholders((input as any)[k], resolver);
    }
    return out;
  }
  return input;
}

function buildBuiltinToApiMap(variables: Array<{ name: string; value: string }>, opValueMappings?: Array<{ apiValue: string; builtinOp?: string }>) {
  const builtinOps = new Set([
    'equals','not_equals','contains','starts_with','ends_with','gt','gte','lt','lte','empty','not_empty','eq','ne','like','in','nin','regex','and','or'
  ]);
  const map: Record<string, string> = {};
  // 支持两种方向：name 为 builtin 或 value 为 builtin
  for (const v of variables || []) {
    const name = (v?.name || '').trim();
    const val = (v?.value || '').trim();
    if (!name || !val) continue;
    if (builtinOps.has(name) && !builtinOps.has(val)) {
      // builtin -> api
      if (!map[name]) map[name] = val;
    } else if (builtinOps.has(val)) {
      // api(name) -> builtin(val) 反向
      if (!map[val]) map[val] = name;
    }
  }
  for (const m of opValueMappings || []) {
    const builtin = (m?.builtinOp || '').trim();
    const api = (m?.apiValue || '').trim();
    if (builtin && api && !map[builtin]) map[builtin] = api;
  }
  return map;
}

function renderTemplateToObject(template: string, item: any, options: {
  builtinToApi: Record<string, string>;
  variableNames: Set<string>;
}) {
  const { builtinToApi, variableNames } = options;
  const safe = (v: any) => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };
  const opRaw = String(item?.op ?? item?.operator ?? '').trim();

  const replaced = replacePlaceholders(template, (token) => {
    // 内置：op、filter.op
    if (token === 'op' || token === 'filter.op') {
      const mapped = builtinToApi[opRaw] || opRaw;
      return safe(mapped);
    }
    if (token === 'filter.field' || token === 'field') return safe(item?.field ?? '');
    if (token === 'filter.value' || token === 'value') return safe(item?.value ?? '');

    // 如果 token 是一个变量名（如 includes），直接输出变量名本身（API 操作符名）
    if (variableNames.has(token)) return safe(token);

    // 如果 token 看起来是内置操作符名，输出映射后的 API 操作符名
    const mappedOp = builtinToApi[token];
    if (mappedOp) return safe(mappedOp);

    return '';
  });

  try {
    return JSON.parse(replaced);
  } catch {
    return null;
  }
}

function buildConditions(filter: any, template: string, builtinToApi: Record<string, string>, logicModes?: Array<'and'|'or'>, variableNames?: Set<string>) {
  if (!filter || typeof filter !== 'object') return [] as any[];
  const modes = (logicModes && logicModes.length ? logicModes : ['and']) as Array<'and'|'or'>;
  const items: any[] = [];

  const candidates: Array<[string, 'and'|'or']> = [ ['and','and'], ['$and','and'], ['or','or'], ['$or','or'] ];

  for (const [key, logical] of candidates) {
    if (!modes.includes(logical)) continue;
    const arr = (filter as any)[key];
    if (Array.isArray(arr)) {
      for (const it of arr) {
        const rendered = renderTemplateToObject(template, it, { builtinToApi, variableNames: variableNames || new Set() });
        if (rendered && typeof rendered === 'object') {
          if (Array.isArray(rendered)) items.push(...rendered); else items.push(rendered);
        }
      }
    }
  }
  return items;
}

app.post('/convert/conditions', (req, res) => {
  const {
    filter,
    itemTemplate,
    logicModes,
    variables,
    opValueMappings,
    targetFieldKey,
  } = (req.body || {}) as {
    filter: any;
    itemTemplate?: string;
    logicModes?: Array<'and'|'or'>;
    variables?: Array<{ name: string; value: string; type?: string }>;
    opValueMappings?: Array<{ apiValue: string; builtinOp?: string }>;
    targetFieldKey?: string;
  };

  const fallbackTemplate = `[
  { "column": "{{ filter.field }}", "operator": "{{ op }}", "value": "{{ filter.value }}" }
]`;

  const builtinToApi = buildBuiltinToApiMap((variables || []).map(v => ({ name: v.name || '', value: v.value || '' })), opValueMappings);
  const variableNames = new Set((variables || []).map(v => (v?.name || '').trim()).filter(Boolean));

  // 先将 filter 内的 "{{ token }}" 展开为变量值（例如 op: "{{ includes }}" -> "contains"）
  const variablesMap: Record<string,string> = {};
  for (const v of variables || []) {
    if (!v?.name) continue;
    variablesMap[v.name] = v.value;
  }
  const resolvedFilter = deepResolvePlaceholders(filter, (token) => variablesMap[token] ?? '');

  const tpl = (typeof itemTemplate === 'string' && itemTemplate.trim()) ? itemTemplate : fallbackTemplate;

  const conditions = buildConditions(resolvedFilter, tpl, builtinToApi, logicModes, variableNames);
  return res.json({
    targetFieldKey: (targetFieldKey || 'conditions'),
    conditions,
  });
});

app.post('/proxy/with-conditions', async (req, res) => {
  try {
    const { filterConfig } = (req.body || {}) as {
      filterConfig?: {
        mode?: 'noco' | 'api';
        location?: 'params' | 'body';
        targetFieldKey?: string;
        conditionMode?: 'simple' | 'composite';
        itemTemplate?: string;
        logicModes?: Array<'and' | 'or'>;
        variables?: Array<{ name: string; value: string; type?: string }>;
        opValueMappings?: Array<{ apiValue: string; builtinOp?: string }>;
        filter?: any;
      };
    };

    const mode = (filterConfig?.mode || 'noco') as 'noco' | 'api';
    const location = (filterConfig?.location || 'params') as 'params' | 'body';
    const targetFieldKey = (filterConfig?.targetFieldKey || 'conditions').trim() || 'conditions';
    const conditionMode = (filterConfig?.conditionMode || 'simple') as 'simple' | 'composite';

    // 默认返回
    const base = { mode, location, targetFieldKey, conditionMode } as const;

    if (mode !== 'api') {
      return res.json({ ...base, conditions: null });
    }

    const rawFilter = filterConfig?.filter;

    if (conditionMode === 'composite') {
      const fallbackTemplate = `[
  { "column": "{{ filter.field }}", "operator": "{{ op }}", "value": "{{ filter.value }}" }
]`;
      const builtinToApi = buildBuiltinToApiMap((filterConfig?.variables || []).map(v => ({ name: v.name || '', value: v.value || '' })), filterConfig?.opValueMappings);
      const variableNames = new Set((filterConfig?.variables || []).map(v => (v?.name || '').trim()).filter(Boolean));
      const variablesMap: Record<string, string> = {};
      for (const v of filterConfig?.variables || []) {
        if (!v?.name) continue;
        variablesMap[v.name] = v.value;
      }
      const resolvedFilter = deepResolvePlaceholders(rawFilter, (token) => variablesMap[token] ?? '');
      const tpl = (typeof filterConfig?.itemTemplate === 'string' && filterConfig?.itemTemplate?.trim()) ? (filterConfig?.itemTemplate as string) : fallbackTemplate;
      const items = buildConditions(resolvedFilter, tpl, builtinToApi, filterConfig?.logicModes, variableNames);

      return res.json({ ...base, conditions: items });
    } else {
      // 简洁模式：直接透传 NocoBase filter
      return res.json({ ...base, conditions: rawFilter ?? {} });
    }
  } catch (err: any) {
    return res.status(200).json({ error: true, message: err?.message || 'Compose conditions failed' });
  }
});

const port = Number(process.env.PORT || 7071);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Proxy server listening at http://localhost:${port}`);
});
