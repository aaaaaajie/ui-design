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
  Switch,
  Checkbox,
  Tooltip,
  Space,
  message
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

// 新增：条件模式
type ConditionMode = 'simple' | 'composite';

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
  opValueMappings: Array<{ key?: string; apiValue: string; builtinOp?: string }>; // API 操作符值 与 内置操作符 的映射（兼容保留）
  // 第三方字段名（如 conditions）
  targetFieldKey?: string;
  // 逻辑模式多选（and/or）
  logicModes?: Array<'and' | 'or'>;
  // 条件项模板（JSON 字符串，支持 {{ filter.field }}、{{ filter.value }}、{{ op }} 以及 {{ eq }} 等）
  itemTemplate?: string;
  // 新增：条件模式（简洁/复合）
  conditionMode?: ConditionMode;
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
  // 新增：UI Display 当前筛选条件（NocoBase filter 对象），用于参与条件转换
  currentFilter?: any;
}

const ApiRequestPanel = forwardRef<any, ApiRequestPanelProps>(({ onResponse, onPaginationChange: _onPaginationChange, onVariableCreate, currentPagination, currentSorter, initialConfig, currentFilter }, ref) => {
  const [method, setMethod] = useState<string>('GET');
  const [url, setUrl] = useState<string>('https://scrm.xiaoshouyi.com/rest/bff/v3.0/neoui/table/search');
  const [headers, setHeaders] = useState<Header[]>([
    { key: 'cookie', name: 'cookie', value: 'sajssdk_2015_cross_new_user=1; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%2219923c712981c5-02242b8b69b3722-16525636-1484784-19923c71299c4e%22%2C%22first_id%22%3A%22%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk5MjNjNzEyOTgxYzUtMDIyNDJiOGI2OWIzNzIyLTE2NTI1NjM2LTE0ODQ3ODQtMTk5MjNjNzEyOTljNGUifQ%3D%3D%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%22%2C%22value%22%3A%22%22%7D%2C%22%24device_id%22%3A%2219923c712981c5-02242b8b69b3722-16525636-1484784-19923c71299c4e%22%7D; Hm_lvt_d21b6cdc9793badd374febecaf294d65=1757241882; HMACCOUNT=3AD837F82FD791C5; Hm_lpvt_d21b6cdc9793badd374febecaf294d65=1757241929; _uetsid=a8781f908bd711f09c620551881265d9|1hu15ew|2|fz4|0|2076; _uetvid=a87843408bd711f0b869c127ff24b508|hmb9un|1757241930067|3|1|bat.bing.com/p/insights/c/l; v2304LoginState=true; Hm_lvt_0ad14a255da043b57b58765e4e703498=1757242024; _jzqa=1.1637154991029309400.1757242024.1757242024.1757242024.1; _jzqc=1; _jzqx=1.1757242024.1757242024.1.jzqsr=login%2Exiaoshouyi%2Ecom|jzqct=/.-; _jzqckmp=1; _qzjc=1; gdxidpyhxdE=NlzuNRloEWpYTN7RnI30m%2FQCHZHt%2FTkJR%5CUxP5bmTNz%2FzWJKQoMaqB2mgbXnyVJok9UbH%2BVbn7%5Cdx8wM3CNmRdWT%2BM0ESoHfcQ7WSi5mKc4JQjQ8oxzhT1woWemM4QpxsdMZWT%2FEIyEgBWQ8URSV88JAaWPCDTZCU5MnnBaiYl2%2Ftruj%3A1757242932856; x-ienterprise-passport="4Gv8bxvDoHLqEHmpRe9PQenZRRiO2PRlFDQbgXHvfg45EMEEFrVBip0xnR8o2pEiiS2y4KMyloc="; x-ienterprise-tenant=3958981768989403; _qzja=1.1696751103.1757242024346.1757242024346.1757242024346.1757242024346.1757242106396..0.1.2.1; _qzjb=1.1757242024346.2.1.0.0; _qzjto=2.1.1; _jzqb=1.4.10.1757242024.1; Hm_lpvt_0ad14a255da043b57b58765e4e703498=1757242107; _ga=GA1.2.415153879.1757242107; _gid=GA1.2.526528352.1757242107; _ga_9D4K3FSTH8=GS2.2.s1757242107$o1$g0$t1757242107$j60$l0$h0; resDomain=https://scrmrs.ingageapp.com; c-user=3958992559822286; 3958981768989403isNeoWeb=true; creekflowG6Designer=true; introduceNewEditionV2509_3958992559822286=0; JSESSIONID=37295C871C516768517660BC8CF3D66B', enabled: true }
  ]);
  const [queryParams, setQueryParams] = useState<QueryParam[]>([
    { key: 'entityApiKey', name: 'entityApiKey', value: 'product', enabled: true }
  ]);
  const [body, setBody] = useState<string>('');
  const [bodyType, setBodyType] = useState<string>('json');
  const [loading, setLoading] = useState<boolean>(false);
  const [transformer, setTransformer] = useState<string>('data.records');
  const [variables, setVariables] = useState<Variable[]>([]);
  // 新增：排序配置 state
  const [sortConfig, setSortConfig] = useState<SortConfig>({ asc: '', desc: '' });
  // 新增：排序映射 state
  const [sortMapping, setSortMapping] = useState<SortMapping>({ mode: 'noco', location: 'params', fieldKey: '', directionKey: '' });
  // 新增：筛选映射 state（扩展默认值：目标字段名、逻辑模式、模板、条件模式）
  const [filterMapping, setFilterMapping] = useState<FilterMapping>({
    mode: 'noco',
    location: 'params',
    opValueMappings: [],
    targetFieldKey: 'conditions',
    logicModes: ['and'],
    itemTemplate: `{
    "column": "{{ filter.field }}",
    "operator": "{{ filter.op }}",
    "value": "{{ filter.value }}"
  }`,
    conditionMode: 'simple',
  });
  // 新增：操作符变量编辑状态
  const [opVarVisible, setOpVarVisible] = useState<boolean>(false);
  const [opVarDraft, setOpVarDraft] = useState<{ apiValue: string; builtinOp?: string }>({ apiValue: '', builtinOp: undefined });
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
  // 新增：提交条件加载态
  const [submittingConditions, setSubmittingConditions] = useState<boolean>(false);

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
      if (initialConfig.filterMapping) setFilterMapping(initialConfig.filterMapping as any);
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

    // 新增：使用 UI Display 传入的当前筛选条件作为内置 filter 变量
    const filterJSON = (() => {
      try {
        if (currentFilter === undefined || currentFilter === null) return '{}';
        // 若已是字符串则尝试校验是否为 JSON，否则直接字符串化对象
        if (typeof currentFilter === 'string') {
          const s = currentFilter.trim();
          if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) return s;
          // 非 JSON 字符串则包一层引号以免 JSON.parse 报错
          return JSON.stringify(currentFilter);
        }
        return JSON.stringify(currentFilter);
      } catch {
        return '{}';
      }
    })();

    // 内置：筛选相关操作符列表
    const defaultOps: string[] = [
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
      // 常用别名
      'eq', 'ne', 'like', 'in', 'nin', 'regex', 'and', 'or'
    ];

    vars.push(
      {
        key: 'builtin-filter',
        name: 'filter',
        value: filterJSON, // 来自 UI Display 的条件
        type: 'object',
        source: 'Filter Config',
        scope: 'NocoBase Request',
        isBuiltIn: true,
      },
      // 将每个操作符作为独立的内置变量暴露
      ...defaultOps.map((op: string) => ({
        key: `builtin-filter-operator-${op}`,
        name: op,
        value: op,
        type: 'operator',
        source: 'Filter Operator',
        scope: 'NocoBase Request',
        isBuiltIn: true,
      }))
    );

    return vars;
  };

  // 新增：获取内置的筛选操作符列表（来自多个内置变量）
  const getFilterOperators = () => {
    try {
      const vars = getBuiltInVariables();
      const ops = vars.filter(v => v.isBuiltIn && (v.source === 'Filter Operator' || v.type === 'operator'));
      if (ops.length) {
        const seen = new Set<string>();
        return ops
          .map(v => String(v.name))
          .filter(name => {
            if (seen.has(name)) return false;
            seen.add(name);
            return true;
          })
          .map(name => ({ label: name, value: name }));
      }
    } catch (_) { }
  };

  // 新增：根据变量名查找变量值（含内置与自定义），并尽量解析为对象
  const findVariableValueByName = (name?: string): any => {
    const targetName = (name && name.trim()) ? name.trim() : 'filter';
    // 修复点：优先使用用户自定义变量，再回退到内置变量，避免内置 filter 覆盖外部传入的同名变量
    const all = [...variables, ...getBuiltInVariables()];
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

  // 新增：提交条件到后端拼接并注入到请求
  const handleSubmitConditions = async () => {
    try {
      setSubmittingConditions(true);
      const filterData = typeof currentFilter !== 'undefined' ? currentFilter : findVariableValueByName('filter');

      const payload = {
        filterConfig: {
          mode: filterMapping.mode || 'noco',
          location: filterMapping.location,
          targetFieldKey: filterMapping.targetFieldKey,
          conditionMode: (filterMapping.conditionMode || 'simple') as 'simple' | 'composite',
          itemTemplate: filterMapping.itemTemplate,
          logicModes: filterMapping.logicModes,
          variables: variables.map(v => ({ name: v.name, value: v.value, type: v.type })),
          opValueMappings: (filterMapping.opValueMappings || []).map(m => ({ apiValue: m.apiValue, builtinOp: m.builtinOp })),
          filter: filterData,
        }
      };

      const resp = await axios.post('http://localhost:7071/proxy/with-conditions', payload, { timeout: 20000 });
      const data = resp.data || {};
      if (data?.error) {
        throw new Error(data?.message || '条件拼接失败');
      }

      const targetKey: string = (data?.targetFieldKey || 'conditions').trim();
      const loc: 'params' | 'body' = (data?.location || 'params');
      const conditions = data?.conditions;

      if (loc === 'params') {
        const valueStr = typeof conditions === 'string' ? conditions : JSON.stringify(conditions ?? {});
        const newParams = [...queryParams];
        const idx = newParams.findIndex(p => p.name === targetKey);
        if (idx >= 0) {
          newParams[idx] = { ...newParams[idx], value: valueStr, enabled: true };
        } else {
          newParams.push({ key: Date.now().toString(), name: targetKey, value: valueStr, enabled: true });
        }
        setQueryParams(newParams);
      } else {
        // 写入 body
        try {
          const bodyObj = body && body.trim() ? JSON.parse(body) : {};
          bodyObj[targetKey] = conditions;
          setBody(JSON.stringify(bodyObj, null, 2));
        } catch (e) {
          message.error('当前 Body 不是有效 JSON，无法注入条件');
          return;
        }
      }

      message.success('条件已拼接并注入到请求');
    } catch (err: any) {
      message.error(err?.message || '提交条件失败');
    } finally {
      setSubmittingConditions(false);
    }
  };

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
      if (cfg.filterMapping) setFilterMapping(cfg.filterMapping as any);
    },
    // 新增：供外部触发条件拼接与注入
    composeAndInjectConditions: async () => {
      await handleSubmitConditions();
    }
  }
  ));

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

  // 新增：更新分页映射配置（整体属性，如 location 或单个字段名）
  const updatePaginationMapping = (field: keyof PaginationMapping, value: any) => {
    const newMapping = { ...paginationMapping, [field]: value } as PaginationMapping;
    setPaginationMapping(newMapping);
    if (_onPaginationChange) {
      _onPaginationChange(newMapping);
    }
  };

  // 新增：更新是否启用及对应字段名
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
    if (_onPaginationChange) {
      _onPaginationChange(newMapping);
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
    if (_onPaginationChange) {
      _onPaginationChange(newMapping);
    }
  };

  // 新增：更新响应字段路径
  const updatePaginationResponseField = (fieldName: keyof PaginationMapping['responseFields'], path: string) => {
    let normalized = path.trim();
    const newMapping: PaginationMapping = {
      ...paginationMapping,
      responseFields: {
        ...paginationMapping.responseFields,
        [fieldName]: normalized,
      },
    };
    setPaginationMapping(newMapping);
    if (_onPaginationChange) {
      _onPaginationChange(newMapping);
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

      // 先设置 params
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

            // 重要：条件由“提交条件”时注入，此处不再拼装

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
        // 重要：当启用 API 条件过滤时，不在此处注入 conditions
        if (Object.keys(minimalBody).length > 0) {
          config.data = minimalBody;
          config.headers['Content-Type'] = 'application/json';
        }
      }

      const useProxy = true; // 如需直连目标接口，设为 false

      let response;
      if (useProxy) {
        // 通过后端代理进行转发（不含条件转换）
        const payload = {
          method: config.method,
          url: config.url,
          headers: config.headers,
          params: config.params,
          data: config.data,
        };
        const proxyRes = await axios.post('http://localhost:7071/proxy/request', payload, { timeout: 30000 });
        // proxy 返回的结构：{ status, statusText, headers, data }
        response = {
          status: proxyRes.data?.status ?? 200,
          statusText: proxyRes.data?.statusText ?? 'OK',
          headers: proxyRes.data?.headers ?? {},
          data: proxyRes.data?.data,
        } as any;
      } else {
        // 直接由浏览器请求
        response = await axios(config);
      }

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

          {(paginationMapping.pagingMode || 'noco') === 'api' ? (
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
                    title: '响应数据路径 (相对 response.data)',
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
                  { key: 'totalPages', label: '总页数(可选)', mappingKey: 'totalPages', placeholder: '如 totalPages 或 meta.totalPages' },
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
              {/* 第一步：选择条件模式 */}
              <div style={{ marginBottom: 12 }}>
                <Text strong>条件模式:</Text>
                <Select
                  size="small"
                  style={{ width: 220, marginLeft: 8 }}
                  value={filterMapping.conditionMode || 'simple'}
                  onChange={(v) => updateFilterMapping('conditionMode', v as any)}
                  options={[
                    { label: '简洁模式（直接传 NocoBase filter）', value: 'simple' },
                    { label: '复合模式（模板 + 变量映射）', value: 'composite' },
                  ]}
                />
              </div>

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

              { (filterMapping.conditionMode || 'simple') === 'composite' && (
                // 第二步：模板与变量映射
                <div style={{ border: '1px solid #f0f0f0', borderRadius: 4, padding: 12, marginBottom: 12 }}>
                  <Row gutter={8}>
                    <Col span={12}>
                      <div style={{ marginBottom: 6 }}><Text strong>第三方条件字段名</Text></div>
                      <Input
                        size="small"
                        placeholder="如：conditions"
                        value={filterMapping.targetFieldKey}
                        onChange={(e) => updateFilterMapping('targetFieldKey', e.target.value)}
                      />
                    </Col>
                    <Col span={12}>
                      <div style={{ marginBottom: 6 }}><Text strong>使用逻辑（可多选）</Text></div>
                      <div>
                        <Checkbox
                          checked={(filterMapping.logicModes || ['and']).includes('and')}
                          onChange={(e) => {
                            const set = new Set(filterMapping.logicModes || ['and']);
                            if (e.target.checked) set.add('and'); else set.delete('and');
                            updateFilterMapping('logicModes', Array.from(set) as any);
                          }}
                          style={{ marginRight: 12 }}
                        >使用 and</Checkbox>
                        <Checkbox
                          checked={(filterMapping.logicModes || ['and']).includes('or')}
                          onChange={(e) => {
                            const set = new Set(filterMapping.logicModes || ['and']);
                            if (e.target.checked) set.add('or'); else set.delete('or');
                            updateFilterMapping('logicModes', Array.from(set) as any);
                          }}
                        >使用 or</Checkbox>
                      </div>
                    </Col>
                  </Row>

                  <div style={{ marginTop: 12 }}>
                    <div style={{ marginBottom: 6 }}><Text strong>条件模板</Text></div>
                    <TextArea
                      rows={6}
                      style={{ fontFamily: 'monospace' }}
                      value={filterMapping.itemTemplate}
                      onChange={(e) => updateFilterMapping('itemTemplate', e.target.value)}
                      placeholder={`例如：\n{\n  \"column\": \"{{ filter.field }}\",\n  \"operator\": \"{{ includes }}\",\n  \"value\": \"{{ filter.value }}\"\n}\n说明：双括号内为变量，变量从 Variables 下映射，如 {{includes}} => {{contains}}。`}
                    />
                  </div>
                </div>
              )}

              {/* 新增：提交条件按钮 */}
              <div style={{ marginBottom: 12 }}>
                <Space>
                  <Button type="primary" loading={submittingConditions} onClick={handleSubmitConditions} size="small">
                    提交条件到请求
                  </Button>
                  <Text type="secondary" style={{ fontSize: 12 }}>点击后将把当前筛选条件转换为目标 API 所需的 conditions 并注入到 Params/Body。</Text>
                </Space>
              </div>

              {/* 操作符变量工作流（保留） */}
              <div style={{ border: '1px solid #f0f0f0', borderRadius: 4, padding: 12 }}>
                <Row align="middle" style={{ marginBottom: 8 }}>
                  <Col flex="auto">
                    <Text strong>操作符变量（推荐）</Text>
                  </Col>
                  <Col>
                    <Tooltip title="将 API 的操作符值与内置操作符（如 eq、like、gt）建立映射。保存后会在下方列表中生成一条自定义变量，类型为 operator。转换时优先使用这些变量完成内置 → API 的映射。">
                      <Text type="secondary" style={{ fontSize: 12, cursor: 'help' }}>如何使用？</Text>
                    </Tooltip>
                  </Col>
                </Row>

                {!opVarVisible ? (
                  <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => setOpVarVisible(true)}>
                    新增操作符变量
                  </Button>
                ) : (
                  <Space wrap style={{ marginBottom: 12 }}>
                    <Input
                      size="small"
                      style={{ width: 220 }}
                      placeholder="API 操作符值，如：=、eq、like、$eq"
                      value={opVarDraft.apiValue}
                      onChange={(e) => setOpVarDraft({ ...opVarDraft, apiValue: e.target.value })}
                    />
                    <Select
                      size="small"
                      style={{ width: 180 }}
                      placeholder="选择内置操作符"
                      value={opVarDraft.builtinOp}
                      onChange={(v) => setOpVarDraft({ ...opVarDraft, builtinOp: v })}
                      options={(getFilterOperators() || []).map(o => ({ label: o.label, value: o.value }))}
                      showSearch
                    />
                    <Space>
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => {
                          const apiValue = (opVarDraft.apiValue || '').trim();
                          const builtin = (opVarDraft.builtinOp || '').trim();
                          if (!apiValue || !builtin) return;
                          addVariable({
                            name: builtin,
                            value: apiValue,
                            type: 'operator',
                            source: 'Filter Operator',
                            scope: 'NocoBase Request',
                          });
                          setOpVarDraft({ apiValue: '', builtinOp: undefined });
                          setOpVarVisible(false);
                        }}
                      >保存</Button>
                      <Button size="small" onClick={() => { setOpVarDraft({ apiValue: '', builtinOp: undefined }); setOpVarVisible(false); }}>取消</Button>
                    </Space>
                  </Space>
                )}

                <Table
                  style={{ marginTop: 8 }}
                  size="small"
                  pagination={false}
                  dataSource={variables.filter(v => !v.isBuiltIn && v.type === 'operator')}
                  rowKey="key"
                  columns={[
                    { title: 'API 操作符', dataIndex: 'value', width: 200, render: (v: string) => <Text>{v}</Text> },
                    { title: '内置操作符', dataIndex: 'name', width: 160, render: (v: string) => <Text code>{v}</Text> },
                    { title: '', width: 60, render: (record: any) => (
                      <Button type="text" size="small" icon={<DeleteOutlined />} onClick={() => removeVariable(record.key)} />
                    )}
                  ]}
                />
              </div>
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
                          // 新增：operator 类型，供操作符变量使用
                          { label: 'operator', value: 'operator' },
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
