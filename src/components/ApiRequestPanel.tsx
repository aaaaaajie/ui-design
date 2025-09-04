import { useState, useImperativeHandle, forwardRef } from 'react';
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

interface PaginationMapping {
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
}

interface Variable {
  key: string;
  name: string;
  value: string;
  type: string;
  source: string; // 来源字段路径
}

interface ApiRequestPanelProps {
  blockId: string;
  onResponse?: (response: any) => void;
  onPaginationChange?: (pagination: any) => void;
  onVariableCreate?: (variable: Variable) => void;
}

const ApiRequestPanel = forwardRef<any, ApiRequestPanelProps>(({ onResponse, onPaginationChange, onVariableCreate }, ref) => {
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
  const [transformer, setTransformer] = useState<string>('data.users');
  const [variables, setVariables] = useState<Variable[]>([]);
  const [paginationMapping, setPaginationMapping] = useState<PaginationMapping>({
    currentPage: 'data.currentPage',
    pageSize: 'data.pageSize',
    total: 'data.totalCount',
    totalPages: 'data.totalPages',
    location: 'params',
    enabledFields: {
      currentPage: true,
      pageSize: true,
      total: true,
      totalPages: true,
    }
  });

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
      if (!paginationMapping.enabledFields.currentPage && !paginationMapping.enabledFields.pageSize) {
        return;
      }

      if (paginationMapping.location === 'params') {
        // 更新查询参数
        const newParams = [...queryParams];

        if (paginationMapping.enabledFields.currentPage && paginationMapping.currentPage) {
          const existingPageParam = newParams.find(p => p.name === paginationMapping.currentPage);
          if (existingPageParam) {
            existingPageParam.value = pagination.current.toString();
          } else {
            newParams.push({
              key: Date.now().toString(),
              name: paginationMapping.currentPage,
              value: pagination.current.toString(),
              enabled: true
            });
          }
        }

        if (paginationMapping.enabledFields.pageSize && paginationMapping.pageSize) {
          const existingPageSizeParam = newParams.find(p => p.name === paginationMapping.pageSize);
          if (existingPageSizeParam) {
            existingPageSizeParam.value = pagination.pageSize.toString();
          } else {
            newParams.push({
              key: Date.now().toString() + '1',
              name: paginationMapping.pageSize,
              value: pagination.pageSize.toString(),
              enabled: true
            });
          }
        }

        setQueryParams(newParams);
      } else if (paginationMapping.location === 'body') {
        // 更新请求体
        try {
          const bodyObj = body ? JSON.parse(body) : {};

          if (paginationMapping.enabledFields.currentPage && paginationMapping.currentPage) {
            bodyObj[paginationMapping.currentPage] = pagination.current;
          }

          if (paginationMapping.enabledFields.pageSize && paginationMapping.pageSize) {
            bodyObj[paginationMapping.pageSize] = pagination.pageSize;
          }

          setBody(JSON.stringify(bodyObj, null, 2));
        } catch (e) {
          console.error('Failed to update body with pagination params:', e);
        }
      }
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

  // 更新分页映射配置
  const updatePaginationMapping = (field: keyof PaginationMapping, value: any) => {
    const newMapping = { ...paginationMapping, [field]: value };
    setPaginationMapping(newMapping);
    if (onPaginationChange) {
      onPaginationChange(newMapping);
    }
  };

  const updatePaginationField = (fieldName: keyof PaginationMapping['enabledFields'], enabled: boolean, mappingField?: string) => {
    const newMapping = {
      ...paginationMapping,
      enabledFields: {
        ...paginationMapping.enabledFields,
        [fieldName]: enabled
      }
    };
    if (mappingField !== undefined) {
      newMapping[fieldName as keyof Omit<PaginationMapping, 'location' | 'enabledFields'>] = mappingField;
    }
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
          paginationMapping: paginationMapping, // 分页映射配置
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
          <div style={{ marginBottom: '16px' }}>
            <Text type="secondary">Map response fields to pagination parameters</Text>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <Text strong>Parameter Location:</Text>
            <Select
              value={paginationMapping.location}
              onChange={(value) => updatePaginationMapping('location', value)}
              style={{ width: '120px', marginLeft: '8px' }}
              size="small"
            >
              <Option value="params">Query Params</Option>
              <Option value="body">Request Body</Option>
            </Select>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            <Row gutter={8} align="middle">
              <Col span={4}>
                <Switch
                  size="small"
                  checked={paginationMapping.enabledFields.currentPage}
                  onChange={(checked) => updatePaginationField('currentPage', checked)}
                />
              </Col>
              <Col span={8}>
                <Text>Current Page:</Text>
              </Col>
              <Col span={12}>
                <Input
                  placeholder="page"
                  value={paginationMapping.currentPage}
                  onChange={(e) => updatePaginationField('currentPage', true, e.target.value)}
                  size="small"
                  disabled={!paginationMapping.enabledFields.currentPage}
                />
              </Col>
            </Row>

            <Row gutter={8} align="middle">
              <Col span={4}>
                <Switch
                  size="small"
                  checked={paginationMapping.enabledFields.pageSize}
                  onChange={(checked) => updatePaginationField('pageSize', checked)}
                />
              </Col>
              <Col span={8}>
                <Text>Page Size:</Text>
              </Col>
              <Col span={12}>
                <Input
                  placeholder="pageSize"
                  value={paginationMapping.pageSize}
                  onChange={(e) => updatePaginationField('pageSize', true, e.target.value)}
                  size="small"
                  disabled={!paginationMapping.enabledFields.pageSize}
                />
              </Col>
            </Row>

            <Row gutter={8} align="middle">
              <Col span={4}>
                <Switch
                  size="small"
                  checked={paginationMapping.enabledFields.total}
                  onChange={(checked) => updatePaginationField('total', checked)}
                />
              </Col>
              <Col span={8}>
                <Text>Total Records:</Text>
              </Col>
              <Col span={12}>
                <Input
                  placeholder="total"
                  value={paginationMapping.total}
                  onChange={(e) => updatePaginationField('total', true, e.target.value)}
                  size="small"
                  disabled={!paginationMapping.enabledFields.total}
                />
              </Col>
            </Row>

            <Row gutter={8} align="middle">
              <Col span={4}>
                <Switch
                  size="small"
                  checked={paginationMapping.enabledFields.totalPages}
                  onChange={(checked) => updatePaginationField('totalPages', checked)}
                />
              </Col>
              <Col span={8}>
                <Text>Total Pages:</Text>
              </Col>
              <Col span={12}>
                <Input
                  placeholder="totalPages"
                  value={paginationMapping.totalPages}
                  onChange={(e) => updatePaginationField('totalPages', true, e.target.value)}
                  size="small"
                  disabled={!paginationMapping.enabledFields.totalPages}
                />
              </Col>
            </Row>
          </div>

          <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px', marginTop: '16px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Configure how pagination data from the response maps to request parameters.
              When enabled, the table pagination will automatically sync with these fields.
            </Text>
          </div>
        </div>
      ),
    },
    {
      key: 'variables',
      label: 'Variables',
      children: (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <Text type="secondary">Manage variables created from response schema</Text>
          </div>
          
          {variables.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <Text>No variables yet. Create variables from the response schema in the right panel.</Text>
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
