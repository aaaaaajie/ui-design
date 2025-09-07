import { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import {
  Input,
  Select,
  Button,
  Tabs,
  Table,
  Typography,
  Row,
  Col,
  Switch
} from 'antd';
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useRef } from 'react';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

interface Header {
  key: string;
  name: string;
  value: string;
  enabled: boolean;
}

interface QueryParam {
  key: string;
  name: string;
  value: string;
  enabled: boolean;
}

// 新增：排序配置类型
interface SortConfig {
  asc: string; // 升序值（如 1 或 asc）
  desc: string; // 降序值（如 -1 或 desc）
}

// 新增：字段来源类型
type PaginationSourceKey = 'currentPage' | 'pageSize' | 'total' | 'totalPages';

// 供外部保存/设置的请求面板配置类型
export interface RequestPanelConfig {
  method: string;
  url: string;
  headers: Header[];
  queryParams: QueryParam[];
  body: string;
  bodyType: string;
  transformer: string;
  paginationMapping: PaginationMapping;
  // 新增：排序配置
  sort?: SortConfig;
  // 新增：排序映射
  sortMapping?: SortMapping;
  // 新增：筛选映射
  filterMapping?: FilterMapping;
}

interface PaginationMapping {
  // 请求侧字段名（写入 params/body 用）
  currentPage: string;
  pageSize: string;
  total: string;
  totalPages: string;
  location: 'params' | 'body';
  // 新增：分页模式（noco = 前端分页, api = 接口分页）
  pagingMode?: 'noco' | 'api';
  enabledFields: {
    currentPage: boolean;
    pageSize: boolean;
    total: boolean;
    totalPages: boolean;
  };
  // 每个字段所绑定的内置变量（用于写入请求）
  valueSources: {
    currentPage: PaginationSourceKey;
    pageSize: PaginationSourceKey;
    total: PaginationSourceKey;
    totalPages: PaginationSourceKey;
  };
  // 新增：响应侧字段路径（相对于 response.data）
  responseFields: {
    currentPage: string;
    pageSize: string;
    total: string;
    totalPages: string;
  };
}

// 新增：排序映射配置
interface SortMapping {
  mode?: 'noco' | 'api';
  location: 'params' | 'body';
  // 新增：排序字段/方向的参数名
  fieldKey?: string; // 如：sortBy
  directionKey?: string; // 如：sortDirection
}

// 新增：筛选映射配置
interface FilterMapping {
  mode?: 'noco' | 'api'; // 筛选模式
  location: 'params' | 'body'; // 参数写入位置
  parseSource?: string; // 解析变量来源（内置变量名）
  transformMode?: 'simple' | 'complex'; // 转换结构模式
  opFieldKey?: string; // 操作符字段名（如 op）
  opValueMappings: Array<{ key: string; apiValue: string; builtinOp?: string }>; // API 操作符值 与 内置操作符 的映射
}

interface Variable {
  key: string;
  name: string;
  value: string;
  type: string;
  source: string; // 来源字段路径
  // 新增：变量作用域
  scope?: string; // 作用域（如：NocoBase Request）
  isBuiltIn?: boolean; // 标识是否为内置变量
}

interface ApiRequestPanelProps {
  blockId: string;
  onResponse?: (response: any) => void;
  onPaginationChange?: (pagination: any) => void;
  onVariableCreate?: (variable: Variable) => void;
  currentPagination?: {
    current: number;
    pageSize: number;
    total: number;
    totalPages?: number;
  };
  // 新增：来自右侧 UI 表格的排序状态
  currentSorter?: {
    field?: string;
    order?: 'ascend' | 'descend' | null;
  };
  // 新增：用于预置一份配置（模版/数据源载入）
  initialConfig?: Partial<RequestPanelConfig>;
}

const ApiRequestPanel = forwardRef<any, ApiRequestPanelProps>(({ onResponse, onPaginationChange, onVariableCreate, currentPagination, currentSorter, initialConfig }, ref) => {
  const [method, setMethod] = useState<string>('GET');
  const [url, setUrl] = useState<string>('http://localhost:3005/api/users');
  const [headers, setHeaders] = useState<Header[]>([
    { key: '1', name: '', value: '', enabled: true }
  ]);
  const [queryParams, setQueryParams] = useState<QueryParam[]>([
    { key: '1', name: '', value: '', enabled: true }
  ]);
  const [body, setBody] = useState<string>('');
  const [bodyType, setBodyType] = useState<string>('json');
  const [loading, setLoading] = useState<boolean>(false);
  const [transformer, setTransformer] = useState<string>('data');
  const [variables, setVariables] = useState<Variable[]>([]);
  // 新增：排序配置 state
  const [sortConfig, setSortConfig] = useState<SortConfig>({ asc: '', desc: '' });
  // 新增：排序映射 state
  const [sortMapping, setSortMapping] = useState<SortMapping>({ mode: 'noco', location: 'params', fieldKey: '', directionKey: '' });
  // 新增：筛选映射 state
  const [filterMapping, setFilterMapping] = useState<FilterMapping>({ mode: 'noco', location: 'params', parseSource: '', transformMode: 'simple', opFieldKey: 'op', opValueMappings: [] });
  const [paginationMapping, setPaginationMapping] = useState<PaginationMapping>({
    currentPage: 'page',
    pageSize: 'pageSize',
    total: 'total',
    totalPages: 'totalPages',
    location: 'params',
    pagingMode: 'noco',
    enabledFields: {
      currentPage: true,
      pageSize: true,
      total: true,
      totalPages: true,
    },
    valueSources: {
      currentPage: 'currentPage',
      pageSize: 'pageSize',
      total: 'total',
      totalPages: 'totalPages',
    },
    // 默认响应字段路径（基于你的示例）
    responseFields: {
      currentPage: 'meta.currentPage',
      pageSize: 'meta.pageSize',
      total: 'meta.totalCount',
      totalPages: 'meta.totalPages',
    }
  });
  // 新增：用于在应用 initialConfig 后自动触发一次请求
  const [shouldAutoRun, setShouldAutoRun] = useState(false);
  // 新增：只有在应用完 initialConfig 后才允许分页联动触发请求，避免首次命中默认 users
  const [hasAppliedInitialConfig, setHasAppliedInitialConfig] = useState<boolean>(() => !initialConfig);
  // 记录上一次的分页，用于判断是否真的变化
  const prevPaginationRef = useRef<{ current: number; pageSize: number } | null>(null);
  // 新增：记录上一次排序
  const prevSorterRef = useRef<{ field?: string; order?: 'ascend' | 'descend' | null } | null>(null);

  // 当传入 initialConfig 时，预填充请求配置
  useEffect(() => {
    if (initialConfig) {
      if (initialConfig.method) setMethod(initialConfig.method);
      if (initialConfig.url) setUrl(initialConfig.url);
      if (initialConfig.headers) setHeaders(initialConfig.headers);
      if (initialConfig.queryParams) setQueryParams(initialConfig.queryParams);
      if (typeof initialConfig.body === 'string') setBody(initialConfig.body);
      if (initialConfig.bodyType) setBodyType(initialConfig.bodyType);
      if (typeof initialConfig.transformer === 'string') setTransformer(initialConfig.transformer);
      if (initialConfig.paginationMapping) setPaginationMapping(initialConfig.paginationMapping);
      // 新增：初始化排序配置
      if (initialConfig.sort) setSortConfig(initialConfig.sort);
      if (initialConfig.sortMapping) setSortMapping(initialConfig.sortMapping);
      // 新增：初始化筛选配置
      if (initialConfig.filterMapping) setFilterMapping(initialConfig.filterMapping);
      // 标记：下一次状态稳定后自动运行一次
      setShouldAutoRun(true);
      setHasAppliedInitialConfig(true);
    } else {
      // 没有初始配置也视为已就绪
      setHasAppliedInitialConfig(true);
    }
  }, [initialConfig]);

  // 在配置应用完成后，自动触发请求一次，避免使用默认 users URL
  useEffect(() => {
    if (!shouldAutoRun) return;
    if (!url || !url.trim()) return;
    // 触发一次请求后清除标记
    const timer = setTimeout(() => {
      handleRequest();
      setShouldAutoRun(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [shouldAutoRun, url, method, headers, queryParams, body, bodyType, transformer, paginationMapping]);

  // 内置分页变量
  const getBuiltInVariables = (): Variable[] => {
    const pagination = currentPagination || { current: 1, pageSize: 10, total: 0, totalPages: 0 };
    const totalPages = pagination.totalPages || Math.ceil((pagination.total || 0) / (pagination.pageSize || 1));

    const vars: Variable[] = [
      {
        key: 'builtin-current-page',
        name: 'currentPage',
        value: pagination.current.toString(),
        type: 'number',
        source: 'UI Display Pagination',
        scope: 'NocoBase Request',
        isBuiltIn: true,
      },
      {
        key: 'builtin-page-size',
        name: 'pageSize',
        value: pagination.pageSize.toString(),
        type: 'number',
        source: 'UI Display Pagination',
        scope: 'NocoBase Request',
        isBuiltIn: true,
      },
      {
        key: 'builtin-total',
        name: 'total',
        value: (pagination.total ?? 0).toString(),
        type: 'number',
        source: 'UI Display Pagination',
        scope: 'NocoBase Request',
        isBuiltIn: true,
      },
      {
        key: 'builtin-total-pages',
        name: 'totalPages',
        value: (totalPages || 0).toString(),
        type: 'number',
        source: 'UI Display Pagination',
        scope: 'NocoBase Request',
        isBuiltIn: true,
      },
    ];

    // 新增：内置筛选相关变量
    const defaultOps = [
      'equals',
      'not_equals',
      'contains',
      'starts_with',
      'ends_with',
      'gt',
      'gte',
      'lt',
      'lte',
      'empty',
      'not_empty',
    ];
    vars.push(
      {
        key: 'builtin-filter',
        name: 'filter',
        value: '{}', // 预留：由 Filter 配置/右侧 UI 生成
        type: 'object',
        source: 'Filter Config',
        scope: 'NocoBase Request',
        isBuiltIn: true,
      },
      {
        key: 'builtin-filter-operators',
        name: 'filterOperators',
        value: JSON.stringify(defaultOps),
        type: 'object',
        source: 'Filter Config',
        scope: 'NocoBase Request',
        isBuiltIn: true,
      }
    );

    return vars;
  };

  // 新增：获取内置的筛选操作符列表（来自变量 filterOperators）
  const getFilterOperators = (): Array<{ label: string; value: string }> => {
    try {
      const vars = getBuiltInVariables();
      const v = vars.find(x => x.name === 'filterOperators');
      if (v && typeof v.value === 'string') {
        const parsed = JSON.parse(v.value);
        if (Array.isArray(parsed)) {
          return parsed.map((op: any) => ({ label: String(op), value: String(op) }));
        }
      }
    } catch (_) {}
    // 回退：默认操作符
    return [
      'equals', 'not_equals', 'contains', 'starts_with', 'ends_with', 'gt', 'gte', 'lt', 'lte', 'empty', 'not_empty'
    ].map(op => ({ label: op, value: op }));
  };

  // 新增：根据变量名查找变量值（含内置与自定义），并尽量解析为对象
  const findVariableValueByName = (name?: string): any => {
    const targetName = (name && name.trim()) ? name.trim() : 'filter';
    const all = [...getBuiltInVariables(), ...variables];
    const v = all.find(x => x.name === targetName);
    if (!v) return undefined;
    try {
      // 若是字符串且为 JSON，则解析
      if (typeof v.value === 'string') {
        const s = v.value.trim();
        if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
          return JSON.parse(s);
        }
        return v.value;
      }
      return v.value as any;
    } catch {
      return v.value as any;
    }
  };

  // 新增：构建 builtin -> api 操作符映射表
  const buildBuiltinToApiOpMap = (): Record<string, string> => {
    const map: Record<string, string> = {};
    (filterMapping.opValueMappings || []).forEach(m => {
      const builtin = (m.builtinOp || '').trim();
      const api = (m.apiValue || '').trim();
      if (builtin && api) map[builtin] = api;
    });
    return map;
  };

  // 新增：深度转换筛选对象中的操作符字段（支持 op/operator/opFieldKey）
  const transformFilterOperatorsDeep = (input: any, opFieldKey: string, builtin2api: Record<string, string>): any => {
    if (Array.isArray(input)) return input.map(i => transformFilterOperatorsDeep(i, opFieldKey, builtin2api));
    if (input && typeof input === 'object') {
      const out: any = Array.isArray(input) ? [] : {};
      const existingKeys = Object.keys(input);
      for (const k of existingKeys) {
        const val = (input as any)[k];
        const lower = k.toLowerCase();
        if (lower === 'op' || lower === 'operator' || k === opFieldKey) {
          const raw = String(val);
          const mapped = builtin2api[raw] || raw;
          out[opFieldKey] = mapped;
        } else {
          out[k] = transformFilterOperatorsDeep(val, opFieldKey, builtin2api);
        }
      }
      return out;
    }
    return input;
  };

  // 内部方法：根据映射获取字段值（来自内置变量）
  const getMappedValue = (sourceKey: PaginationSourceKey): string => {
    const vars = getBuiltInVariables();
    const map: Record<string, Variable> = vars.reduce((acc, v) => {
      acc[v.name] = v;
      return acc;
    }, {} as Record<string, Variable>);
    return map[sourceKey]?.value ?? '';
  };

  // 内部方法：更新分页参数（写入 params 或 body）
  const updatePaginationParams = (_pagination: { current: number; pageSize: number }) => {
    // 如果是 NocoBase 分页，不写入请求参数
    if (paginationMapping.pagingMode === 'noco') {
      return;
    }
    // 仅当有需要同步的字段时执行
    if (!paginationMapping.enabledFields.currentPage && !paginationMapping.enabledFields.pageSize) {
      return;
    }

    if (paginationMapping.location === 'params') {
      // 更新查询参数
      const newParams = [...queryParams];

      // 当前页
      if (paginationMapping.enabledFields.currentPage && paginationMapping.currentPage) {
        const value = getMappedValue(paginationMapping.valueSources.currentPage);
        const existing = newParams.find(p => p.name === paginationMapping.currentPage);
        if (existing) {
          existing.value = value;
        } else {
          newParams.push({
            key: Date.now().toString(),
            name: paginationMapping.currentPage,
            value,
            enabled: true,
          });
        }
      }

      // 每页条数
      if (paginationMapping.enabledFields.pageSize && paginationMapping.pageSize) {
        const value = getMappedValue(paginationMapping.valueSources.pageSize);
        const existing = newParams.find(p => p.name === paginationMapping.pageSize);
        if (existing) {
          existing.value = value;
        } else {
          newParams.push({
            key: (Date.now() + 1).toString(),
            name: paginationMapping.pageSize,
            value,
            enabled: true,
          });
        }
      }

      setQueryParams(newParams);
    } else if (paginationMapping.location === 'body') {
      // 更新请求体
      try {
        const bodyObj = body ? JSON.parse(body) : {};

        if (paginationMapping.enabledFields.currentPage && paginationMapping.currentPage) {
          bodyObj[paginationMapping.currentPage] = Number(getMappedValue(paginationMapping.valueSources.currentPage));
        }
        if (paginationMapping.enabledFields.pageSize && paginationMapping.pageSize) {
          bodyObj[paginationMapping.pageSize] = Number(getMappedValue(paginationMapping.valueSources.pageSize));
        }

        setBody(JSON.stringify(bodyObj, null, 2));
      } catch (e) {
        console.error('Failed to update body with pagination params:', e);
      }
    }
  };

  // 监听分页变化，自动更新参数并执行请求
  useEffect(() => {
    // 仅在完成初始配置应用后触发（去掉 shouldAutoRun 阻断，避免首次配置期间分页切换无效）
    if (!hasAppliedInitialConfig) return;
    if (!url.trim()) return;

    const isNoco = (paginationMapping.pagingMode || 'api') === 'noco';

    // 若首次进入，记录当前分页但不触发请求，避免与 shouldAutoRun 的一次请求重复
    if (prevPaginationRef.current === null) {
      if (currentPagination) {
        prevPaginationRef.current = { current: currentPagination.current, pageSize: currentPagination.pageSize };
      }
      return;
    }

    // 检测分页是否真的发生变化
    const prev = prevPaginationRef.current;
    const curr = currentPagination;
    const changed = !!curr && (!!prev ? (prev.current !== curr.current || prev.pageSize !== curr.pageSize) : true);

    if (!changed) return;

    // 更新记录
    if (curr) {
      prevPaginationRef.current = { current: curr.current, pageSize: curr.pageSize };
    }

    // API 分页：写入请求参数后再请求；NocoBase：不写参数也请求
    if (!isNoco && currentPagination && (paginationMapping.enabledFields.currentPage || paginationMapping.enabledFields.pageSize)) {
      const pagination = {
        current: currentPagination.current,
        pageSize: currentPagination.pageSize,
      };
      updatePaginationParams(pagination);
    }

    const timer = setTimeout(() => {
      handleRequest();
    }, 100);
    return () => clearTimeout(timer);
  }, [currentPagination?.current, currentPagination?.pageSize, hasAppliedInitialConfig, /* shouldAutoRun removed */, url, paginationMapping.enabledFields.currentPage, paginationMapping.enabledFields.pageSize, paginationMapping.pagingMode]);

  // 添加变量
  const addVariable = (variableData: Omit<Variable, 'key'>) => {
    const newVariable: Variable = {
      key: Date.now().toString(),
      ...variableData,
    };
    setVariables(prev => [...prev, newVariable]);
    if (onVariableCreate) {
      onVariableCreate(newVariable);
    }
  };

  // 删除变量
  const removeVariable = (key: string) => {
    setVariables(prev => prev.filter(v => v.key !== key));
  };

  // 更新变量
  const updateVariable = (key: string, field: keyof Variable, value: any) => {
    setVariables(prev => prev.map(variable =>
      variable.key === key ? { ...variable, [field]: value } : variable
    ));
  };

  // 新增：更新排序映射配置
  const updateSortMapping = (field: keyof SortMapping, value: any) => {
    setSortMapping(prev => ({ ...prev, [field]: value }));
  };

  // 新增：更新筛选映射配置
  const updateFilterMapping = (field: keyof FilterMapping, value: any) => {
    setFilterMapping((prev) => ({ ...prev, [field]: value }));
  };

  const addOpMappingRow = () => {
    setFilterMapping((prev) => ({ ...prev, opValueMappings: [...(prev.opValueMappings || []), { key: Date.now().toString(), apiValue: '', builtinOp: undefined }] }));
  };
  const updateOpMappingRow = (rowKey: string, patch: Partial<{ apiValue: string; builtinOp?: string }>) => {
    setFilterMapping((prev) => ({
      ...prev,
      opValueMappings: (prev.opValueMappings || []).map(r => r.key === rowKey ? { ...r, ...patch } : r)
    }));
  };
  const removeOpMappingRow = (rowKey: string) => {
    setFilterMapping((prev) => ({
      ...prev,
      opValueMappings: (prev.opValueMappings || []).filter(r => r.key !== rowKey)
    }));
  };

  // 新增：根据当前 sorter 更新 params/body
  const updateSortParams = (sorter: { field: string; order: 'ascend' | 'descend' }) => {
    if ((sortMapping.mode || 'noco') === 'noco') return;
    const dirRaw = sorter.order === 'ascend' ? sortConfig.asc : sortConfig.desc;
    const dirVal = dirRaw && dirRaw.trim() ? dirRaw.trim() : (sorter.order === 'ascend' ? 'asc' : 'desc');

    const fieldKey = (sortMapping.fieldKey || '').trim();
    const directionKey = (sortMapping.directionKey || '').trim();

    if (sortMapping.location === 'params') {
      const newParams = [...queryParams];

      if (fieldKey) {
        const idx = newParams.findIndex(p => p.name === fieldKey);
        if (idx >= 0) {
          newParams[idx] = { ...newParams[idx], value: sorter.field, enabled: true };
        } else {
          newParams.push({ key: Date.now().toString(), name: fieldKey, value: sorter.field, enabled: true });
        }
      }

      if (directionKey) {
        const idx2 = newParams.findIndex(p => p.name === directionKey);
        if (idx2 >= 0) {
          newParams[idx2] = { ...newParams[idx2], value: dirVal, enabled: true };
        } else {
          newParams.push({ key: (Date.now() + 1).toString(), name: directionKey, value: dirVal, enabled: true });
        }
      }

      // 兼容：未配置任何键时，沿用旧逻辑（使用字段名作为 key）
      if (!fieldKey && !directionKey) {
        // 若上一次的排序字段与本次不同，清理旧字段
        const prevField = prevSorterRef.current?.field;
        if (prevField && prevField !== sorter.field) {
          const idxOld = newParams.findIndex(p => p.name === prevField);
          if (idxOld >= 0) newParams.splice(idxOld, 1);
        }
        const existing = newParams.find(p => p.name === sorter.field);
        if (existing) {
          existing.value = dirVal;
          existing.enabled = true;
        } else {
          newParams.push({ key: (Date.now() + 2).toString(), name: sorter.field, value: dirVal, enabled: true });
        }
      }

      setQueryParams(newParams);
    } else if (sortMapping.location === 'body') {
      try {
        const bodyObj = body && body.trim() ? JSON.parse(body) : {};

        if (fieldKey) bodyObj[fieldKey] = sorter.field;
        if (directionKey) bodyObj[directionKey] = dirVal;

        // 兼容：未配置任何键时，沿用旧逻辑（使用字段名作为 key）
        if (!fieldKey && !directionKey) {
          const prevField = prevSorterRef.current?.field;
          if (prevField && prevField !== sorter.field && Object.prototype.hasOwnProperty.call(bodyObj, prevField)) {
            delete bodyObj[prevField];
          }
          bodyObj[sorter.field] = dirVal;
        }

        setBody(JSON.stringify(bodyObj, null, 2));
      } catch (e) {
        console.error('Failed to update body with sort params:', e);
      }
    }
  };

  // 新增：清空排序参数（当取消排序时）
  const clearSortParam = (field?: string) => {
    if ((sortMapping.mode || 'noco') === 'noco') return;
    const fieldKey = (sortMapping.fieldKey || '').trim();
    const directionKey = (sortMapping.directionKey || '').trim();

    if (sortMapping.location === 'params') {
      let newParams = [...queryParams];
      if (fieldKey) newParams = newParams.filter(p => p.name !== fieldKey);
      if (directionKey) newParams = newParams.filter(p => p.name !== directionKey);
      // 兼容：若未配置键，则按旧逻辑用字段名清理
      if (!fieldKey && !directionKey && field) newParams = newParams.filter(p => p.name !== field);
      setQueryParams(newParams);
    } else if (sortMapping.location === 'body') {
      try {
        const bodyObj = body && body.trim() ? JSON.parse(body) : {};
        if (fieldKey && Object.prototype.hasOwnProperty.call(bodyObj, fieldKey)) delete bodyObj[fieldKey];
        if (directionKey && Object.prototype.hasOwnProperty.call(bodyObj, directionKey)) delete bodyObj[directionKey];
        // 兼容：未配置时按旧逻辑清理
        if (!fieldKey && !directionKey && field && Object.prototype.hasOwnProperty.call(bodyObj, field)) delete bodyObj[field];
        setBody(JSON.stringify(bodyObj, null, 2));
      } catch (e) {
        console.error('Failed to clear sort param from body:', e);
      }
    }
  };

  // 新增：监听排序变化（来自 UI 表格）
  useEffect(() => {
    if (!hasAppliedInitialConfig) return;
    if (!url.trim()) return;

    const curr = currentSorter || {};

    // 首次：如果有有效排序，直接应用并触发
    if (prevSorterRef.current === null) {
      prevSorterRef.current = { field: curr.field, order: curr.order };
      if ((sortMapping.mode || 'noco') === 'api' && curr.field && curr.order) {
        updateSortParams({ field: curr.field, order: curr.order as 'ascend' | 'descend' });
        const timer = setTimeout(() => handleRequest(), 100);
        return () => clearTimeout(timer);
      }
      return;
    }

    const prev = prevSorterRef.current || {};
    const changed = prev.field !== curr.field || prev.order !== curr.order;
    if (!changed) return;

    prevSorterRef.current = { field: curr.field, order: curr.order };

    if ((sortMapping.mode || 'noco') === 'api') {
      if (curr.field && curr.order) {
        updateSortParams({ field: curr.field, order: curr.order as 'ascend' | 'descend' });
      } else {
        // 取消排序：清理上一次字段
        clearSortParam(prev.field);
      }
      const timer = setTimeout(() => handleRequest(), 100);
      return () => clearTimeout(timer);
    }
  }, [currentSorter?.field, currentSorter?.order, hasAppliedInitialConfig, url, sortMapping.mode, sortMapping.location, sortMapping.fieldKey, sortMapping.directionKey, sortConfig.asc, sortConfig.desc]);

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    updatePaginationParams: (pagination: { current: number; pageSize: number }) => {
      updatePaginationParams(pagination);
    },
    triggerRequest: () => {
      handleRequest();
    },
    addVariable: (variableData: Omit<Variable, 'key'>) => {
      addVariable(variableData);
    },
    // 新增：获取当前完整配置
    getCurrentConfig: (): RequestPanelConfig => ({
      method,
      url,
      headers,
      queryParams,
      body,
      bodyType,
      transformer,
      paginationMapping,
      sort: sortConfig,
      sortMapping,
      filterMapping,
    }),
    // 新增：设置配置（便于外部注入模板）
    setConfig: (cfg: Partial<RequestPanelConfig>) => {
      if (cfg.method) setMethod(cfg.method);
      if (cfg.url) setUrl(cfg.url);
      if (cfg.headers) setHeaders(cfg.headers);
      if (cfg.queryParams) setQueryParams(cfg.queryParams);
      if (typeof cfg.body === 'string') setBody(cfg.body);
      if (cfg.bodyType) setBodyType(cfg.bodyType);
      if (typeof cfg.transformer === 'string') setTransformer(cfg.transformer);
      if (cfg.paginationMapping) setPaginationMapping(cfg.paginationMapping);
      // 新增：设置排序配置
      if (cfg.sort) setSortConfig(cfg.sort);
      if (cfg.sortMapping) setSortMapping(cfg.sortMapping);
      // 新增：设置筛选配置
      if (cfg.filterMapping) setFilterMapping(cfg.filterMapping);
    }
  }));

  // 添加 Header
  const addHeader = () => {
    const newKey = Date.now().toString();
    setHeaders([...headers, { key: newKey, name: '', value: '', enabled: true }]);
  };

  // 删除 Header
  const removeHeader = (key: string) => {
    setHeaders(headers.filter(item => item.key !== key));
  };

  // 更新 Header
  const updateHeader = (key: string, field: keyof Header, value: any) => {
    setHeaders(headers.map(item =>
      item.key === key ? { ...item, [field]: value } : item
    ));
  };

  // 添加查询参数
  const addQueryParam = () => {
    const newKey = Date.now().toString();
    setQueryParams([...queryParams, { key: newKey, name: '', value: '', enabled: true }]);
  };

  // 删除查询参数
  const removeQueryParam = (key: string) => {
    setQueryParams(queryParams.filter(item => item.key !== key));
  };

  // 更新查询参数
  const updateQueryParam = (key: string, field: keyof QueryParam, value: any) => {
    setQueryParams(queryParams.map(item =>
      item.key === key ? { ...item, [field]: value } : item
    ));
  };

  // 更新分页映射配置（整体属性，如 location 或单个字段名）
  const updatePaginationMapping = (field: keyof PaginationMapping, value: any) => {
    const newMapping = { ...paginationMapping, [field]: value } as PaginationMapping;
    setPaginationMapping(newMapping);
    if (onPaginationChange) {
      onPaginationChange(newMapping);
    }
  };

  // 已有：更新是否启用及对应字段名
  const updatePaginationField = (fieldName: keyof PaginationMapping['enabledFields'], enabled: boolean, mappingField?: string) => {
    const newMapping: PaginationMapping = {
      ...paginationMapping,
      enabledFields: {
        ...paginationMapping.enabledFields,
        [fieldName]: enabled
      }
    } as PaginationMapping;
    if (mappingField !== undefined) {
      (newMapping as any)[fieldName] = mappingField;
    }
    setPaginationMapping(newMapping);
    if (onPaginationChange) {
      onPaginationChange(newMapping);
    }
  };

  // 新增：更新字段的内置变量绑定（请求侧）
  const updatePaginationValueSource = (fieldName: keyof PaginationMapping['valueSources'], source: PaginationSourceKey) => {
    const newMapping: PaginationMapping = {
      ...paginationMapping,
      valueSources: {
        ...paginationMapping.valueSources,
        [fieldName]: source,
      },
    };
    setPaginationMapping(newMapping);
    if (onPaginationChange) {
      onPaginationChange(newMapping);
    }
  };

  // 新增：更新响应字段路径
  const updatePaginationResponseField = (fieldName: keyof PaginationMapping['responseFields'], path: string) => {
    // 允许用户输入如 "response.data.totalCount" 或 "data.totalCount"，统一裁剪到相对 data 的路径
    let normalized = path.trim();
    // if (normalized.startsWith('response.data.')) {
    //   normalized = normalized.replace(/^response\.data\./, '');
    // } else if (normalized.startsWith('data.')) {
    //   normalized = normalized.replace(/^data\./, '');
    // }

    const newMapping: PaginationMapping = {
      ...paginationMapping,
      responseFields: {
        ...paginationMapping.responseFields,
        [fieldName]: normalized,
      },
    };
    setPaginationMapping(newMapping);
    if (onPaginationChange) {
      onPaginationChange(newMapping);
    }
  };

  // 发送请求
  const handleRequest = async () => {
    if (!url.trim()) {
      return;
    }

    setLoading(true);

    try {
      const isNoco = (paginationMapping.pagingMode || 'api') === 'noco';

      // 构建请求配置
      const config: any = {
        method: method.toLowerCase(),
        url: url,
        headers: {},
        params: {},
      };

      // 添加启用的 Headers
      headers
        .filter(h => h.enabled && h.name.trim() && h.value.trim())
        .forEach(h => {
          config.headers[h.name] = h.value;
        });

      // 基于当前映射与模式，构建有效的 Query Params
      const effectiveParams: Record<string, any> = {};
      queryParams
        .filter(p => p.enabled && p.name.trim())
        .forEach(p => {
          effectiveParams[p.name] = p.value;
        });

      const stripKeys: string[] = [];
      if (paginationMapping.currentPage) stripKeys.push(paginationMapping.currentPage);
      if (paginationMapping.pageSize) stripKeys.push(paginationMapping.pageSize);

      if (isNoco) {
        // NocoBase 分页：剔除分页相关参数
        stripKeys.forEach(k => { if (k in effectiveParams) delete effectiveParams[k]; });
      } else {
        // API 分页：将分页写入到 params（当映射位置为 params 且启用）
        if (paginationMapping.location === 'params') {
          if (paginationMapping.enabledFields.currentPage && paginationMapping.currentPage) {
            effectiveParams[paginationMapping.currentPage] = getMappedValue(paginationMapping.valueSources.currentPage);
          }
          if (paginationMapping.enabledFields.pageSize && paginationMapping.pageSize) {
            effectiveParams[paginationMapping.pageSize] = getMappedValue(paginationMapping.valueSources.pageSize);
          }
        } else {
          // 当写入位置为 body 时，确保 params 不携带分页字段（若之前存在则移除）
          stripKeys.forEach(k => { if (k in effectiveParams) delete effectiveParams[k]; });
        }
      }

      // 新增：排序注入/剔除（仅当选择 API 排序时注入）
      const sortModeIsApi = (sortMapping.mode || 'noco') === 'api';
      const cs = currentSorter;
      if (sortModeIsApi && cs?.field && cs.order) {
        const dirRaw = cs.order === 'ascend' ? sortConfig.asc : sortConfig.desc;
        const dirVal = dirRaw && dirRaw.trim() ? dirRaw.trim() : (cs.order === 'ascend' ? 'asc' : 'desc');
        const fieldKey = (sortMapping.fieldKey || '').trim();
        const directionKey = (sortMapping.directionKey || '').trim();
        if (sortMapping.location === 'params') {
          if (fieldKey) effectiveParams[fieldKey] = cs.field;
          if (directionKey) effectiveParams[directionKey] = dirVal;
          // 兼容：未配置任何键时，沿用旧逻辑（使用字段名作为 key）
          if (!fieldKey && !directionKey) {
            effectiveParams[cs.field] = dirVal;
          }
        }
      } else {
        // Noco 排序：不往 params 写入（这里不强制清理历史，避免误删用户手填参数）
      }

      // 新增：当启用 API 条件过滤时注入筛选
      const filterModeIsApi = (filterMapping.mode || 'noco') === 'api';
      if (filterModeIsApi) {
        const sourceName = (filterMapping.parseSource && filterMapping.parseSource.trim()) || 'filter';
        const rawVal = findVariableValueByName(sourceName);
        if (rawVal !== undefined && rawVal !== null && sourceName) {
          // 尝试转换
          const opKey = (filterMapping.opFieldKey || 'op').trim();
          const map = buildBuiltinToApiOpMap();
          const transformed = (filterMapping.transformMode || 'complex') === 'complex'
            ? transformFilterOperatorsDeep(rawVal, opKey, map)
            : rawVal;

          if (filterMapping.location === 'params') {
            // params 中以字符串形式传递，避免变成 filter[field]=xxx 的展开
            (effectiveParams as any)['filter'] = typeof transformed === 'string' ? transformed : JSON.stringify(transformed);
          }
        }
      }

      config.params = effectiveParams;

      // 添加请求体（如果不是 GET 方法）
      if (method !== 'GET' && body.trim()) {
        if (bodyType === 'json') {
          try {
            let bodyObj = body ? JSON.parse(body) : {};

            if (isNoco) {
              // NocoBase 分页：从 body 中剔除分页字段
              stripKeys.forEach(k => { if (k in bodyObj) delete bodyObj[k]; });
            } else if (paginationMapping.location === 'body') {
              // API 分页：将分页写入到 body（仅在映射位置为 body 且启用）
              if (paginationMapping.enabledFields.currentPage && paginationMapping.currentPage) {
                bodyObj[paginationMapping.currentPage] = Number(getMappedValue(paginationMapping.valueSources.currentPage));
              }
              if (paginationMapping.enabledFields.pageSize && paginationMapping.pageSize) {
                bodyObj[paginationMapping.pageSize] = Number(getMappedValue(paginationMapping.valueSources.pageSize));
              }
            }

            // 新增：当排序写入 body 且选择 API 排序时，注入排序
            if ((sortMapping.mode || 'noco') === 'api' && sortMapping.location === 'body' && cs?.field && cs.order) {
              const dirRaw2 = cs.order === 'ascend' ? sortConfig.asc : sortConfig.desc;
              const dirVal2 = dirRaw2 && dirRaw2.trim() ? dirRaw2.trim() : (cs.order === 'ascend' ? 'asc' : 'desc');
              const fieldKey = (sortMapping.fieldKey || '').trim();
              const directionKey = (sortMapping.directionKey || '').trim();
              if (fieldKey) bodyObj[fieldKey] = cs.field;
              if (directionKey) bodyObj[directionKey] = dirVal2;
              if (!fieldKey && !directionKey) {
                bodyObj[cs.field] = dirVal2;
              }
            }

            // 新增：当筛选写入 body 且选择 API 条件过滤时，注入筛选
            if ((filterMapping.mode || 'noco') === 'api' && filterMapping.location === 'body') {
              const sourceName = (filterMapping.parseSource && filterMapping.parseSource.trim()) || 'filter';
              const rawVal = findVariableValueByName(sourceName);
              if (rawVal !== undefined && rawVal !== null && sourceName) {
                const opKey = (filterMapping.opFieldKey || 'op').trim();
                const map = buildBuiltinToApiOpMap();
                const transformed = (filterMapping.transformMode || 'simple') === 'complex'
                  ? transformFilterOperatorsDeep(rawVal, opKey, map)
                  : rawVal;
                (bodyObj as any)['filter'] = transformed;
              }
            }

            config.data = bodyObj;
            config.headers['Content-Type'] = 'application/json';
          } catch (e) {
            console.error('Invalid JSON format');
            return;
          }
        } else {
          // 其他 body 类型：不做分页参数注入/移除
          config.data = body;
        }
      } else if (method !== 'GET' && !body.trim() && !isNoco && paginationMapping.location === 'body') {
        // 当需要将分页写入 body 且当前无 body 时，可按需生成最小 body
        const minimalBody: any = {};
        if (paginationMapping.enabledFields.currentPage && paginationMapping.currentPage) {
          minimalBody[paginationMapping.currentPage] = Number(getMappedValue(paginationMapping.valueSources.currentPage));
        }
        if (paginationMapping.enabledFields.pageSize && paginationMapping.pageSize) {
          minimalBody[paginationMapping.pageSize] = Number(getMappedValue(paginationMapping.valueSources.pageSize));
        }
        // 新增：当排序写入 body 且选择 API 排序时，注入排序
        if ((sortMapping.mode || 'noco') === 'api' && sortMapping.location === 'body' && currentSorter?.field && currentSorter.order) {
          const dirRaw = currentSorter.order === 'ascend' ? sortConfig.asc : sortConfig.desc;
          const dirVal = dirRaw && dirRaw.trim() ? dirRaw.trim() : (currentSorter.order === 'ascend' ? 'asc' : 'desc');
          const fieldKey = (sortMapping.fieldKey || '').trim();
          const directionKey = (sortMapping.directionKey || '').trim();
          if (fieldKey) minimalBody[fieldKey] = currentSorter.field;
          if (directionKey) minimalBody[directionKey] = dirVal;
          if (!fieldKey && !directionKey && currentSorter.field) minimalBody[currentSorter.field] = dirVal;
        }
        // 新增：当筛选写入 body 且选择 API 条件过滤时，注入筛选
        if ((filterMapping.mode || 'noco') === 'api' && filterMapping.location === 'body') {
          const sourceName = (filterMapping.parseSource && filterMapping.parseSource.trim()) || 'filter';
          const rawVal = findVariableValueByName(sourceName);
          if (rawVal !== undefined && rawVal !== null && sourceName) {
            const opKey = (filterMapping.opFieldKey || 'op').trim();
            const map = buildBuiltinToApiOpMap();
            const transformed = (filterMapping.transformMode || 'simple') === 'complex'
              ? transformFilterOperatorsDeep(rawVal, opKey, map)
              : rawVal;
            (minimalBody as any)['filter'] = transformed;
          }
        }
        if (Object.keys(minimalBody).length > 0) {
          config.data = minimalBody;
          config.headers['Content-Type'] = 'application/json';
        }
      }

      const response = await axios(config);

      // 应用 transformer 提取数据
      let transformedData = response.data;
      if (transformer.trim()) {
        try {
          const paths = transformer.split('.');
          for (const path of paths) {
            if (path.trim()) {
              transformedData = transformedData[path.trim()];
            }
          }
        } catch (e) {
          console.warn('Transformer path not found, using original data');
          transformedData = response.data;
        }
      }

      // 传递响应给父组件
      if (onResponse) {
        onResponse({
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data, // 原始数据
          transformedData: transformedData, // 转换后的数据
          paginationMapping: paginationMapping, // 分页映射配置（含响应映射）
          config: config,
          timestamp: new Date().toISOString(),
        });
      }

    } catch (error: any) {
      if (onResponse) {
        onResponse({
          error: true,
          status: error.response?.status || 0,
          statusText: error.response?.statusText || 'Network Error',
          headers: error.response?.headers || {},
          data: error.response?.data || error.message,
          config: error.config,
          timestamp: new Date().toISOString(),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Headers 表格列
  const headerColumns = [
    {
      title: '',
      dataIndex: 'enabled',
      width: 50,
      render: (enabled: boolean, record: Header) => (
        <Switch
          size="small"
          checked={enabled}
          onChange={(checked) => updateHeader(record.key, 'enabled', checked)}
        />
      ),
    },
    {
      title: 'Key',
      dataIndex: 'name',
      render: (name: string, record: Header) => (
        <Input
          placeholder="Header name"
          value={name}
          onChange={(e) => updateHeader(record.key, 'name', e.target.value)}
          size="small"
        />
      ),
    },
    {
      title: 'Value',
      dataIndex: 'value',
      render: (value: string, record: Header) => (
        <Input
          placeholder="Header value"
          value={value}
          onChange={(e) => updateHeader(record.key, 'value', e.target.value)}
          size="small"
        />
      ),
    },
    {
      title: '',
      width: 50,
      render: (record: Header) => (
        <Button
          type="text"
          icon={<DeleteOutlined />}
          size="small"
          onClick={() => removeHeader(record.key)}
        />
      ),
    },
  ];

  // 查询参数表格列
  const paramColumns = [
    {
      title: '',
      dataIndex: 'enabled',
      width: 50,
      render: (enabled: boolean, record: QueryParam) => (
        <Switch
          size="small"
          checked={enabled}
          onChange={(checked) => updateQueryParam(record.key, 'enabled', checked)}
        />
      ),
    },
    {
      title: 'Key',
      dataIndex: 'name',
      render: (name: string, record: QueryParam) => (
        <Input
          placeholder="Parameter name"
          value={name}
          onChange={(e) => updateQueryParam(record.key, 'name', e.target.value)}
          size="small"
        />
      ),
    },
    {
      title: 'Value',
      dataIndex: 'value',
      render: (value: string, record: QueryParam) => (
        <Input
          placeholder="Parameter value"
          value={value}
          onChange={(e) => updateQueryParam(record.key, 'value', e.target.value)}
          size="small"
        />
      ),
    },
    {
      title: '',
      width: 50,
      render: (record: QueryParam) => (
        <Button
          type="text"
          icon={<DeleteOutlined />}
          size="small"
          onClick={() => removeQueryParam(record.key)}
        />
      ),
    },
  ];

  const tabItems = [
    {
      key: 'params',
      label: 'Params',
      children: (
        <div>
          <Table
            columns={paramColumns}
            dataSource={queryParams}
            pagination={false}
            size="small"
            showHeader={false}
          />
          <Button
            type="dashed"
            onClick={addQueryParam}
            style={{ marginTop: '8px', width: '100%' }}
            size="small"
          >
            <PlusOutlined /> Add Parameter
          </Button>
        </div>
      ),
    },
    {
      key: 'headers',
      label: 'Headers',
      children: (
        <div>
          <Table
            columns={headerColumns}
            dataSource={headers}
            pagination={false}
            size="small"
            showHeader={false}
          />
          <Button
            type="dashed"
            onClick={addHeader}
            style={{ marginTop: '8px', width: '100%' }}
            size="small"
          >
            <PlusOutlined /> Add Header
          </Button>
        </div>
      ),
    },
    {
      key: 'body',
      label: 'Body',
      children: (
        <div>
          <Row gutter={8} style={{ marginBottom: '8px' }}>
            <Col>
              <Select
                value={bodyType}
                onChange={setBodyType}
                size="small"
                style={{ width: '120px' }}
              >
                <Option value="json">JSON</Option>
                <Option value="text">Text</Option>
                <Option value="form">Form Data</Option>
              </Select>
            </Col>
          </Row>
          <TextArea
            placeholder={bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Request body...'}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            style={{ fontFamily: 'monospace' }}
          />
        </div>
      ),
    },
    {
      key: 'transformer',
      label: 'Transformer',
      children: (
        <div>
          <div style={{ marginBottom: '8px' }}>
            <Text type="secondary">Extract data from response using dot notation</Text>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <Text>
              Example: <code>data.users</code> extracts <code>response.data.users</code>
            </Text>
          </div>
          <Input
            placeholder="data.users"
            value={transformer}
            onChange={(e) => setTransformer(e.target.value)}
            style={{ marginBottom: '8px' }}
          />
          <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Leave empty to use the full response data for UI display
            </Text>
          </div>
        </div>
      ),
    },
    {
      key: 'filter',
      label: 'Filter',
      children: (
        <div>
          {/* 筛选模式 */}
          <div style={{ marginBottom: 12 }}>
            <Text strong>筛选模式:</Text>
            <Select
              size="small"
              style={{ width: 220, marginLeft: 8 }}
              value={filterMapping.mode || 'noco'}
              onChange={(v) => updateFilterMapping('mode', v)}
              options={[
                { label: '使用 NocoBase 条件过滤', value: 'noco' },
                { label: '使用 API 条件过滤', value: 'api' },
              ]}
            />
          </div>

          {(filterMapping.mode || 'noco') === 'api' ? (
            <>
              <div style={{ marginBottom: 12 }}>
                <Text strong>参数写入位置:</Text>
                <Select
                  size="small"
                  style={{ width: 160, marginLeft: 8 }}
                  value={filterMapping.location}
                  onChange={(v) => updateFilterMapping('location', v)}
                  options={[{ label: 'Query Params', value: 'params' }, { label: 'Request Body', value: 'body' }]}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <Text strong>解析变量:</Text>
                <Select
                  size="small"
                  style={{ width: 260, marginLeft: 8 }}
                  placeholder="请选择内置变量（稍后补充）"
                  value={filterMapping.parseSource}
                  onChange={(v) => updateFilterMapping('parseSource', v)}
                  options={getBuiltInVariables().map(v => ({ label: v.name, value: v.name }))}
                  showSearch
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <Text strong>定义转换结构:</Text>
                <Select
                  size="small"
                  style={{ width: 260, marginLeft: 8 }}
                  value={filterMapping.transformMode || 'simple'}
                  onChange={(v) => updateFilterMapping('transformMode', v)}
                  options={[
                    { label: '平铺', value: 'simple' },
                    { label: '自定义', value: 'complex' },
                  ]}
                />
              </div>

              {(filterMapping.transformMode || 'simple') === 'complex' && (
                <div style={{ border: '1px solid #f0f0f0', borderRadius: 4, padding: 12 }}>
                  <Row gutter={8} style={{ marginBottom: 8 }}>
                    <Col span={12}>
                      <Text strong>操作符字段名</Text>
                      <Input
                        size="small"
                        placeholder="如：op"
                        style={{ marginTop: 6 }}
                        value={filterMapping.opFieldKey}
                        onChange={(e) => updateFilterMapping('opFieldKey', e.target.value)}
                      />
                    </Col>
                  </Row>
                  <Table
                    size="small"
                    pagination={false}
                    rowKey={(r: any) => r.key}
                    columns={[
                      {
                        title: 'API 操作符值',
                        dataIndex: 'apiValue',
                        render: (_: any, record: any) => (
                          <Input
                            size="small"
                            placeholder="如：eq、contains"
                            value={record.apiValue}
                            onChange={(e) => updateOpMappingRow(record.key, { apiValue: e.target.value })}
                          />
                        ),
                      },
                      {
                        title: '绑定内置操作符',
                        dataIndex: 'builtinOp',
                        render: (_: any, record: any) => (
                          <Select
                            size="small"
                            style={{ width: '100%' }}
                            placeholder="请选择（稍后补充内置操作符）"
                            value={record.builtinOp}
                            onChange={(v) => updateOpMappingRow(record.key, { builtinOp: v })}
                            options={getFilterOperators()}
                          />
                        ),
                      },
                      {
                        title: '',
                        width: 50,
                        render: (record: any) => (
                          <Button type="text" size="small" onClick={() => removeOpMappingRow(record.key)}>Delete</Button>
                        )
                      }
                    ]}
                    dataSource={filterMapping.opValueMappings || []}
                  />
                  <Button type="dashed" style={{ marginTop: 8 }} size="small" onClick={addOpMappingRow}>+ Add Operator Mapping</Button>

                  <div style={{ marginTop: 12, color: '#888', fontSize: 12 }}>
                    示例（自定义结构）：
                    <pre style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: 8, borderRadius: 4, border: '1px solid #f0f0f0' }}>
{`query={"$and":[{"field":"a","${filterMapping.opFieldKey || 'op'}":"eq","value":1},{"field":"b","${filterMapping.opFieldKey || 'op'}":"contains","value":2}]}`}
                    </pre>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ background: '#fffbe6', padding: 12, border: '1px solid #ffe58f', borderRadius: 4 }}>
              <Text>已启用「使用 NocoBase 条件过滤」：不向请求写入筛选参数，过滤逻辑由前端或 NocoBase 统一处理。</Text>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'pagination',
      label: 'Pagination',
      children: (
        <div>
          {/* 分页模式切换 */}
          <div style={{ marginBottom: 12 }}>
            <Text strong>分页模式:</Text>
            <Select
              size="small"
              style={{ width: 200, marginLeft: 8 }}
              value={paginationMapping.pagingMode || 'noco'}
              onChange={(v) => updatePaginationMapping('pagingMode', v)}
            >
              <Option value="noco">使用 NocoBase 分页</Option>
              <Option value="api">使用 API 分页</Option>
            </Select>
          </div>

          {(paginationMapping.pagingMode || 'api') === 'api' ? (
            <>
              <div style={{ marginBottom: '16px' }}>
                <Text strong>参数写入位置:</Text>
                <Select
                  value={paginationMapping.location}
                  onChange={(value) => updatePaginationMapping('location', value)}
                  style={{ width: 140, marginLeft: 8 }}
                  size="small"
                >
                  <Option value="params">Query Params</Option>
                  <Option value="body">Request Body</Option>
                </Select>
              </div>

              {/* 请求映射表 */}
              <Table
                size="small"
                pagination={false}
                rowKey={(record: any) => record.key}
                columns={[
                  {
                    title: '请求参数名',
                    dataIndex: 'param',
                    render: (_: any, record: any) => (
                      <Input
                        placeholder={record.placeholder}
                        value={(paginationMapping as any)[record.mappingKey]}
                        onChange={(e) => updatePaginationField(record.mappingKey as keyof PaginationMapping['enabledFields'], true, e.target.value)}
                        size="small"
                      />
                    ),
                  },
                  {
                    title: '绑定内置变量',
                    dataIndex: 'source',
                    render: (_: any, record: any) => {
                      const vars = getBuiltInVariables();
                      return (
                        <Select
                          size="small"
                          style={{ width: '100%' }}
                          value={(paginationMapping.valueSources as any)[record.mappingKey]}
                          onChange={(val: PaginationSourceKey) => updatePaginationValueSource(record.mappingKey as keyof PaginationMapping['valueSources'], val)}
                          options={vars.map(v => ({
                            label: `${v.name}`,
                            value: v.name as PaginationSourceKey,
                          }))}
                        />
                      );
                    },
                  },
                ]}
                dataSource={[
                  { key: 'currentPage', label: '当前页', mappingKey: 'currentPage', placeholder: '如 page' },
                  { key: 'pageSize', label: '条数', mappingKey: 'pageSize', placeholder: '如 limit 或 pageSize' },
                ]}
              />

              {/* 响应映射表 */}
              <Table
                size="small"
                pagination={false}
                rowKey={(record: any) => `resp-${record.key}`}
                columns={[
                  {
                    title: '响应数据路径',
                    dataIndex: 'respPath',
                    render: (_: any, record: any) => (
                      <Input
                        placeholder={record.placeholder}
                        value={(paginationMapping.responseFields as any)[record.mappingKey]}
                        onChange={(e) => updatePaginationResponseField(record.mappingKey as keyof PaginationMapping['responseFields'], e.target.value)}
                        size="small"
                      />
                    ),
                  },
                  {
                    title: '绑定内置变量',
                    dataIndex: 'bind',
                    render: (_: any, record: any) => (
                      <Select
                        size="small"
                        style={{ width: '100%' }}
                        value={record.mappingKey}
                        disabled
                        options={[
                          { label: 'currentPage', value: 'currentPage' },
                          { label: 'pageSize', value: 'pageSize' },
                          { label: 'total', value: 'total' },
                          { label: 'totalPages', value: 'totalPages' },
                        ]}
                      />
                    ),
                  },
                ]}
                dataSource={[
                  { key: 'total', label: '总条数', mappingKey: 'total', placeholder: '如 totalCount 或 meta.total' },
                  { key: 'currentPage', label: '当前页', mappingKey: 'currentPage', placeholder: '如 currentPage 或 page.current' },
                  { key: 'pageSize', label: '每页条数', mappingKey: 'pageSize', placeholder: '如 pageSize 或 page.size' },
                  { key: 'totalPages', label: '总页数(可选)', mappingKey: 'totalPages', placeholder: '如 totalPages' },
                ]}
              />
            </>
          ) : (
            <div style={{ background: '#fffbe6', padding: 12, border: '1px solid #ffe58f', borderRadius: 4 }}>
              <Text>已启用「使用 NocoBase 分页」：
                1) 不再向请求写入分页参数；
                2) 忽略响应中的分页字段；
                3) 表格分页将基于数据量在前端计算。</Text>
            </div>
          )}
        </div>
      ),
    },
    // 新增：排序 Tab（位于 Pagination 后面）
    {
      key: 'sort',
      label: 'Sort',
      children: (
        <div>
          <div style={{ marginBottom: 12 }}>
            <Text strong>排序模式:</Text>
            <Select
              size="small"
              style={{ width: 200, marginLeft: 8 }}
              value={sortMapping.mode || 'noco'}
              onChange={(v) => updateSortMapping('mode', v)}
            >
              <Option value="noco">使用 NocoBase 排序</Option>
              <Option value="api">使用 API 排序</Option>
            </Select>
          </div>

          {(sortMapping.mode || 'noco') === 'api' ? (
            <>
              <div style={{ marginBottom: '16px' }}>
                <Text strong>参数写入位置:</Text>
                <Select
                  value={sortMapping.location}
                  onChange={(value) => updateSortMapping('location', value)}
                  style={{ width: 140, marginLeft: 8 }}
                  size="small"
                >
                  <Option value="params">Query Params</Option>
                  <Option value="body">Request Body</Option>
                </Select>
              </div>

              {/* 新增：排序参数名配置 */}
              <Row gutter={8} style={{ marginBottom: 12 }}>
                <Col span={12}>
                  <div style={{ marginBottom: 6 }}><Text strong>排序字段参数名</Text></div>
                  <Input
                    placeholder="如：sortBy"
                    value={sortMapping.fieldKey}
                    onChange={(e) => updateSortMapping('fieldKey', e.target.value)}
                    size="small"
                  />
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 6 }}><Text strong>排序方向参数名</Text></div>
                  <Input
                    placeholder="如：sortDirection"
                    value={sortMapping.directionKey}
                    onChange={(e) => updateSortMapping('directionKey', e.target.value)}
                    size="small"
                  />
                </Col>
              </Row>

              <Row gutter={8}>
                <Col span={12}>
                  <div style={{ marginBottom: 6 }}><Text strong>升序值</Text></div>
                  <Input
                    placeholder="如：1 或 asc"
                    value={sortConfig.asc}
                    onChange={(e) => setSortConfig({ ...sortConfig, asc: e.target.value })}
                    size="small"
                  />
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 6 }}><Text strong>降序值</Text></div>
                  <Input
                    placeholder="如：-1 或 desc"
                    value={sortConfig.desc}
                    onChange={(e) => setSortConfig({ ...sortConfig, desc: e.target.value })}
                    size="small"
                  />
                </Col>
              </Row>
            </>
          ) : (
            <div style={{ background: '#fffbe6', padding: 12, border: '1px solid #ffe58f', borderRadius: 4 }}>
              <Text>已启用「使用 NocoBase 排序」：
                1) 不再向请求写入排序参数；
                2) 忽略响应中的排序设置；
                3) 表格排序将基于响应数据在前端进行。</Text>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'variables',
      label: 'Variables',
      children: (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <Table
              columns={[
                {
                  title: 'Name',
                  dataIndex: 'name',
                  render: (name: string) => (
                    <Text strong style={{ color: '#1890ff' }}>{name}</Text>
                  ),
                },
                {
                  title: 'Type',
                  dataIndex: 'type',
                  render: (type: string) => (
                    <Text type="secondary">{type}</Text>
                  ),
                },
                {
                  title: 'Scope',
                  dataIndex: 'scope',
                  render: (scope: string) => (
                    <Text type="secondary" style={{ fontSize: '12px' }}>{scope || 'NocoBase Request'}</Text>
                  ),
                },
              ]}
              dataSource={getBuiltInVariables()}
              pagination={false}
              size="small"
              showHeader={true}
            />
          </div>

          {/* 用户创建的变量 */}
          <div>
            <Title level={5} style={{ fontSize: '14px', marginBottom: '12px' }}>
              Custom Variables
            </Title>
            {variables.length === 0 ? (
              <Text type="secondary">暂无自定义变量</Text>
            ) : (
              <Table
                columns={[
                  {
                    title: 'Name',
                    dataIndex: 'name',
                    render: (name: string, record: Variable) => (
                      <Input
                        value={name}
                        onChange={(e) => updateVariable(record.key, 'name', e.target.value)}
                        placeholder="Variable name"
                        size="small"
                      />
                    ),
                  },
                  {
                    title: 'Value',
                    dataIndex: 'value',
                    render: (value: string, record: Variable) => (
                      <Input
                        value={value}
                        onChange={(e) => updateVariable(record.key, 'value', e.target.value)}
                        placeholder="Variable value"
                        size="small"
                      />
                    ),
                  },
                  {
                    title: 'Type',
                    dataIndex: 'type',
                    render: (type: string, record: Variable) => (
                      <Select
                        size="small"
                        style={{ width: '100%' }}
                        value={type}
                        onChange={(val) => updateVariable(record.key, 'type', val)}
                        options={[
                          { label: 'string', value: 'string' },
                          { label: 'number', value: 'number' },
                          { label: 'boolean', value: 'boolean' },
                          { label: 'object', value: 'object' },
                        ]}
                      />
                    ),
                  },
                  {
                    title: 'Scope',
                    dataIndex: 'scope',
                    render: (scope: string, record: Variable) => (
                      <Select
                        size="small"
                        style={{ width: '100%' }}
                        value={scope || 'NocoBase Request'}
                        onChange={(val) => updateVariable(record.key, 'scope', val)}
                        options={[{ label: 'NocoBase Request', value: 'NocoBase Request' }]}
                      />
                    ),
                  },
                  {
                    title: '',
                    width: 50,
                    render: (record: Variable) => (
                      <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        size="small"
                        onClick={() => removeVariable(record.key)}
                      />
                    ),
                  },
                ]}
                dataSource={variables}
                pagination={false}
                size="small"
              />
            )}
          </div>

          <div style={{ background: '#f0f8ff', padding: '12px', borderRadius: '4px', marginTop: '16px', border: '1px solid #d6e7ff' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <strong>Built-in variables:</strong> Automatically synced with UI Display pagination values. These variables reflect the current state of the table pagination.
              <br />
              <strong>Custom variables:</strong> Created from response schema analysis and can be manually edited.
            </Text>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Title level={5}>Request</Title>

      {/* URL 输入区域 */}
      <Row gutter={8} style={{ marginBottom: '16px' }}>
        <Col flex="120px">
          <Select
            value={method}
            onChange={setMethod}
            style={{ width: '100%' }}
          >
            <Option value="GET">GET</Option>
            <Option value="POST">POST</Option>
            <Option value="PUT">PUT</Option>
            <Option value="DELETE">DELETE</Option>
            <Option value="PATCH">PATCH</Option>
            <Option value="HEAD">HEAD</Option>
            <Option value="OPTIONS">OPTIONS</Option>
          </Select>
        </Col>
        <Col flex="1">
          <Input
            placeholder="Enter request URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleRequest}
            loading={loading}
          >
            Run
          </Button>
        </Col>
      </Row>

      {/* 请求配置标签页 */}
      <Tabs items={tabItems} size="small" />
    </div>
  );
});

export default ApiRequestPanel;
