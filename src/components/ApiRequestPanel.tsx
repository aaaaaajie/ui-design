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

interface Variable {
  key: string;
  name: string;
  value: string;
  type: string;
  source: string; // 来源字段路径
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
  // 新增：用于预置一份配置（模版/数据源载入）
  initialConfig?: Partial<RequestPanelConfig>;
}

const ApiRequestPanel = forwardRef<any, ApiRequestPanelProps>(({ onResponse, onPaginationChange, onVariableCreate, currentPagination, initialConfig }, ref) => {
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
      currentPage: 'currentPage',
      pageSize: 'pageSize',
      total: 'totalCount',
      totalPages: 'totalPages',
    }
  });
  // 新增：用于在应用 initialConfig 后自动触发一次请求
  const [shouldAutoRun, setShouldAutoRun] = useState(false);
  // 新增：只有在应用完 initialConfig 后才允许分页联动触发请求，避免首次命中默认 users
  const [hasAppliedInitialConfig, setHasAppliedInitialConfig] = useState<boolean>(() => !initialConfig);
  // 记录上一次的分页，用于判断是否真的变化，避免初次渲染或非分页变更导致的重复请求
  const prevPaginationRef = useRef<{ current: number; pageSize: number } | null>(null);
  
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
    
    return [
      {
        key: 'builtin-current-page',
        name: 'currentPage',
        value: pagination.current.toString(),
        type: 'number',
        source: 'UI Display Pagination',
        isBuiltIn: true,
      },
      {
        key: 'builtin-page-size',
        name: 'pageSize',
        value: pagination.pageSize.toString(),
        type: 'number',
        source: 'UI Display Pagination',
        isBuiltIn: true,
      },
      {
        key: 'builtin-total',
        name: 'total',
        value: (pagination.total ?? 0).toString(),
        type: 'number',
        source: 'UI Display Pagination',
        isBuiltIn: true,
      },
      {
        key: 'builtin-total-pages',
        name: 'totalPages',
        value: (totalPages || 0).toString(),
        type: 'number',
        source: 'UI Display Pagination',
        isBuiltIn: true,
      },
    ];
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
    // 仅在完成初始配置应用后，且不处于自动运行阶段时触发
    if (!hasAppliedInitialConfig || shouldAutoRun) return;
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
  }, [currentPagination?.current, currentPagination?.pageSize, hasAppliedInitialConfig, shouldAutoRun, url, paginationMapping.enabledFields.currentPage, paginationMapping.enabledFields.pageSize, paginationMapping.pagingMode]);

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

          { (paginationMapping.pagingMode || 'api') === 'api' ? (
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
                  title: 'Source',
                  dataIndex: 'source',
                  render: (source: string) => (
                    <Text type="secondary" style={{ fontSize: '12px' }}>{source}</Text>
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
              <div style={{ textAlign: 'center', padding: '20px', color: '#999', background: '#fafafa', borderRadius: '4px' }}>
                <Text>No custom variables yet. Create variables from the response schema in the right panel.</Text>
              </div>
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
                        value={type}
                        onChange={(value) => updateVariable(record.key, 'type', value)}
                        size="small"
                        style={{ width: '100px' }}
                      >
                        <Option value="string">String</Option>
                        <Option value="number">Number</Option>
                        <Option value="boolean">Boolean</Option>
                        <Option value="object">Object</Option>
                      </Select>
                    ),
                  },
                  {
                    title: 'Source',
                    dataIndex: 'source',
                    render: (source: string) => (
                      <Text type="secondary" style={{ fontSize: '12px' }}>{source}</Text>
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
