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

interface PaginationMapping {
  // 请求侧字段名（写入 params/body 用）
  currentPage: string;
  pageSize: string;
  total: string;
  totalPages: string;
  location: 'params' | 'body';
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
}

const ApiRequestPanel = forwardRef<any, ApiRequestPanelProps>(({ onResponse, onPaginationChange, onVariableCreate, currentPagination }, ref) => {
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
    if (currentPagination && url.trim()) {
      if (paginationMapping.enabledFields.currentPage || paginationMapping.enabledFields.pageSize) {
        const pagination = { 
          current: currentPagination.current, 
          pageSize: currentPagination.pageSize 
        };
        updatePaginationParams(pagination);
        const timer = setTimeout(() => {
          handleRequest();
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [currentPagination?.current, currentPagination?.pageSize]);

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

      // 添加启用的查询参数
      queryParams
        .filter(p => p.enabled && p.name.trim() && p.value.trim())
        .forEach(p => {
          config.params[p.name] = p.value;
        });

      // 添加请求体（如果不是 GET 方法）
      if (method !== 'GET' && body.trim()) {
        if (bodyType === 'json') {
          try {
            config.data = JSON.parse(body);
            config.headers['Content-Type'] = 'application/json';
          } catch (e) {
            console.error('Invalid JSON format');
            return;
          }
        } else {
          config.data = body;
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
          <div style={{ marginBottom: '12px' }}>
            <Text type="secondary">为请求端分页建立映射：左侧填写请求需要的参数名，右侧选择绑定的系统内置变量。</Text>
          </div>

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

          {
            // 请求映射表
          }
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

          <div style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              当右侧表格分页变化时（页码/条数），会根据上面的映射自动写入到 {paginationMapping.location === 'params' ? 'Query Params' : 'Request Body'}。
              例如：如果条数字段名填为 <code>limit</code> 且绑定到内置 <code>pageSize</code>，切换每页条数时会自动设置 <code>limit</code>。
            </Text>
          </div>

          <div style={{ marginTop: 24, marginBottom: 8 }}>
            <Text strong>响应数据映射到分页变量</Text>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                从响应数据中提取分页信息。填写路径相对于 <code>response.data</code>，例如 <code>totalCount</code>、<code>result.page.current</code>。
                也可输入 <code>data.totalCount</code> 或 <code>response.data.totalCount</code>，系统会自动规范化。
              </Text>
            </div>
          </div>

          {
            // 响应映射表
          }
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
        </div>
      ),
    },
    {
      key: 'variables',
      label: 'Variables',
      children: (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <Text type="secondary">Built-in pagination variables and custom variables</Text>
          </div>
          <div style={{ marginBottom: '24px' }}>
            <Title level={5} style={{ fontSize: '14px', marginBottom: '12px', color: '#1890ff' }}>
              Built-in Pagination Variables
            </Title>
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
                  title: 'Value',
                  dataIndex: 'value',
                  render: (value: string) => (
                    <Text code>{value}</Text>
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
