import React, { useState } from 'react';
import {
  Typography,
  Card,
  Tabs,
  Button,
  Dropdown,
  Table,
  Descriptions,
  Form,
  Input,
  Space,
  Tag,
  Divider,
  Alert,
  Select
} from 'antd';
import { DownOutlined, TableOutlined, FileTextOutlined, FormOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface ResponseData {
  status?: number;
  statusText?: string;
  headers?: Record<string, any>;
  data?: any;
  transformedData?: any; // 新增转换后的数据
  paginationMapping?: any; // 分页映射配置
  config?: any;
  timestamp?: string;
  error?: boolean;
}

interface ApiResponsePanelProps {
  blockId: string;
  response?: ResponseData | null;
  onDisplayUI?: (component: React.ReactNode) => void;
  onPaginationChange?: (pagination: { current: number; pageSize: number }) => void;
  onTriggerRequest?: () => void;
  onCreateVariable?: (variableData: { name: string; value: string; type: string; source: string }) => void;
}

const ApiResponsePanel: React.FC<ApiResponsePanelProps> = ({ response, onDisplayUI, onPaginationChange, onTriggerRequest, onCreateVariable }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitConfig, setSubmitConfig] = useState({
    method: 'POST',
    url: '',
    headers: {} as Record<string, string>,
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
  });

  // 规范化响应路径，支持输入 response.data.xxx 或 data.xxx，统一为相对 data 的路径
  const normalizeResponsePath = (path?: string): string => {
    if (!path) return '';
    let p = String(path).trim();
    if (p.startsWith('response.data.')) return p.replace(/^response\.data\./, '');
    if (p.startsWith('data.')) return p.replace(/^data\./, '');
    return p;
  };

  const toNumber = (val: any, fallback: number): number => {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
  };

  // 从响应数据中提取分页信息（支持自定义响应字段路径）
  const extractPaginationFromResponse = (response: ResponseData) => {
    if (!response || response.error) return;

    const mapping = response.paginationMapping || {};
    const respFields = mapping.responseFields || {};
    const data = response.data;

    if (!data || typeof data !== 'object') return;

    const newPagination = { ...pagination };

    // 提取当前页
    if (respFields.currentPage) {
      const currentPath = normalizeResponsePath(respFields.currentPage);
      if (currentPath) {
        const currentPageValue = getNestedValue(data, currentPath);
        if (currentPageValue !== undefined) {
          newPagination.current = toNumber(currentPageValue, newPagination.current);
        }
      }
    }

    // 提取每页条数
    if (respFields.pageSize) {
      const sizePath = normalizeResponsePath(respFields.pageSize);
      if (sizePath) {
        const pageSizeValue = getNestedValue(data, sizePath);
        if (pageSizeValue !== undefined) {
          newPagination.pageSize = toNumber(pageSizeValue, newPagination.pageSize);
        }
      }
    }

    // 提取总记录数
    let extractedTotal: number | undefined = undefined;
    if (respFields.total) {
      const totalPath = normalizeResponsePath(respFields.total);
      if (totalPath) {
        const totalValue = getNestedValue(data, totalPath);
        if (totalValue !== undefined) {
          extractedTotal = toNumber(totalValue, newPagination.total);
          newPagination.total = extractedTotal;
        }
      }
    }

    // 提取总页数（若提供），在没有 total 时用 totalPages * pageSize 估算 total
    if (respFields.totalPages) {
      const totalPagesPath = normalizeResponsePath(respFields.totalPages);
      if (totalPagesPath) {
        const totalPagesValue = getNestedValue(data, totalPagesPath);
        if (totalPagesValue !== undefined) {
          const tp = toNumber(totalPagesValue, NaN);
          if (Number.isFinite(tp) && !Number.isFinite(extractedTotal as number)) {
            // 仅当未从 total 提取到值时，才用 totalPages 推导 total
            const size = newPagination.pageSize > 0 ? newPagination.pageSize : 10;
            newPagination.total = tp * size;
          }
        }
      }
    }
    console.log(newPagination, '456');
    setPagination(newPagination);
  };

  // 获取嵌套对象的值
  const getNestedValue = (obj: any, path: string): any => {
    if (!path) return undefined;
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  // 处理分页变化
  const handleTablePaginationChange = (page: number, pageSize: number) => {
    const newPagination = { ...pagination, current: page, pageSize };
    setPagination(newPagination);

    if (onPaginationChange) {
      onPaginationChange({ current: page, pageSize });
    }

    // 自动触发 API 请求（如果父层提供该回调）
    if (onTriggerRequest) {
      // 使用 setTimeout 确保参数更新后再触发请求
      setTimeout(() => {
        onTriggerRequest();
      }, 100);
    }
  };

  // 当响应数据变化时，提取分页信息
  React.useEffect(() => {
    if (response) {
      extractPaginationFromResponse(response);
    }
  }, [response]);

  // 新增：响应或分页改变时，自动将表格渲染到 UI Display（等效于自动点击“Display on UI”-> Table）
  React.useEffect(() => {
    if (!response || response.error || !onDisplayUI) return;
    const dataToUse = response.transformedData !== undefined ? response.transformedData : response.data;
    console.log(response, '123');
    onDisplayUI(
      <Table
        columns={generateTableColumns(dataToUse)}
        dataSource={convertToTableData(dataToUse)}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          pageSizeOptions: [5, 10, 20, 50, 100],
          total: pagination.total,
          showSizeChanger: pagination.showSizeChanger,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
          onChange: handleTablePaginationChange,
          onShowSizeChange: handleTablePaginationChange,
        }}
        scroll={{ x: true }}
        size="small"
      />
    );
    // 仅在 response 或分页值变化时更新显示
  }, [response, pagination.current, pagination.pageSize]);

  // 生成数据字段schema
  const generateSchema = (data: any, prefix: string = ''): Array<{ key: string; field: string; type: string; value: any; path: string }> => {
    const schema: Array<{ key: string; field: string; type: string; value: any; path: string }> = [];
    
    if (!data || typeof data !== 'object') return schema;
    
    const processObject = (obj: any, currentPrefix: string) => {
      Object.entries(obj).forEach(([key, value], index) => {
        const path = currentPrefix ? `${currentPrefix}.${key}` : key;
        const fieldType = Array.isArray(value) ? 'array' : typeof value;
        
        schema.push({
          key: `${currentPrefix}-${key}-${index}`,
          field: key,
          type: fieldType,
          value: fieldType === 'object' ? JSON.stringify(value) : String(value),
          path: path
        });
        
        // 如果是对象且不是数组，递归处理
        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
          processObject(value, path);
        }
      });
    };
    
    if (Array.isArray(data) && data.length > 0) {
      // 如果是数组，处理第一个元素作为schema样本
      processObject(data[0], prefix);
    } else {
      processObject(data, prefix);
    }
    
    return schema;
  };

  // 处理创建变量
  const handleCreateVariable = (fieldData: { field: string; type: string; value: any; path: string }) => {
    if (onCreateVariable) {
      onCreateVariable({
        name: fieldData.field,
        value: fieldData.value,
        type: fieldData.type,
        source: fieldData.path
      });
    }
  };

  // 显示模式下拉菜单
  const displayMenuItems: MenuProps['items'] = [
    {
      key: 'table',
      label: 'Table',
      icon: <TableOutlined />,
      onClick: () => handleDisplayMode('table'),
    },
    {
      key: 'detail',
      label: 'Detail',
      icon: <FileTextOutlined />,
      onClick: () => handleDisplayMode('detail'),
    },
    {
      key: 'form',
      label: 'Form',
      icon: <FormOutlined />,
      onClick: () => handleDisplayMode('form'),
    },
  ];

  // 处理显示模式选择
  const handleDisplayMode = (mode: 'table' | 'detail' | 'form') => {
    if (!response || response.error) return;

    const dataToUse = response.transformedData !== undefined ? response.transformedData : response.data;
    let component: React.ReactNode = null;

    switch (mode) {
      case 'table':
        component = (
          <Table
            columns={generateTableColumns(dataToUse)}
            dataSource={convertToTableData(dataToUse)}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              pageSizeOptions: [5, 10, 20, 50, 100],
              total: pagination.total,
              showSizeChanger: pagination.showSizeChanger,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
              onChange: handleTablePaginationChange,
              onShowSizeChange: handleTablePaginationChange,
            }}
            scroll={{ x: true }}
            size="small"
          />
        );
        break;
      case 'detail':
        component = renderDetailView(dataToUse);
        break;
      case 'form':
        component = renderFormView(dataToUse);
        break;
    }

    if (component && onDisplayUI) {
      onDisplayUI(component);
    }
  };

  // 渲染响应状态
  const renderStatus = (response: ResponseData) => {
    const statusColor = response.error
      ? 'error'
      : response.status && response.status >= 200 && response.status < 300
        ? 'success'
        : 'warning';

    return (
      <Space>
        <Tag color={statusColor}>
          {response.status || 'N/A'} {response.statusText || ''}
        </Tag>
        <Text type="secondary">{response.timestamp}</Text>
      </Space>
    );
  };

  // 将对象转换为表格数据
  const convertToTableData = (data: any): any[] => {
    if (Array.isArray(data)) {
      return data.map((item, index) => ({ key: index, ...item }));
    } else if (typeof data === 'object' && data !== null) {
      return [{ key: 0, ...data }];
    }
    return [{ key: 0, value: data }];
  };

  // 生成表格列
  const generateTableColumns = (data: any): any[] => {
    if (!data || (Array.isArray(data) && data.length === 0)) return [];

    const sample = Array.isArray(data) ? data[0] : data;
    if (typeof sample !== 'object' || sample === null) {
      return [
        {
          title: 'Value',
          dataIndex: 'value',
          key: 'value',
        },
      ];
    }

    return Object.keys(sample).map(key => ({
      title: key.charAt(0).toUpperCase() + key.slice(1),
      dataIndex: key,
      key,
      render: (value: any) => {
        if (typeof value === 'object') {
          return <pre>{JSON.stringify(value, null, 2)}</pre>;
        }
        return String(value);
      },
    }));
  };

  // 渲染详情视图
  const renderDetailView = (data: any) => {
    if (typeof data !== 'object' || data === null) {
      return <Paragraph><pre>{JSON.stringify(data, null, 2)}</pre></Paragraph>;
    }

    const items = Object.entries(data).map(([key, value], index) => ({
      key: index.toString(),
      label: key.charAt(0).toUpperCase() + key.slice(1),
      children: typeof value === 'object'
        ? <pre>{JSON.stringify(value, null, 2)}</pre>
        : String(value),
    }));

    return <Descriptions items={items} column={1} bordered />;
  };

  // 渲染表单视图
  const renderFormView = (data: any) => {
    const fields = typeof data === 'object' && data !== null ? data : {};

    return (
      <div>
        <Form
          layout="vertical"
          initialValues={fields}
          onValuesChange={(_, allValues) => setFormData(allValues)}
        >
          {Object.entries(fields).map(([key, value]) => (
            <Form.Item
              key={key}
              name={key}
              label={key.charAt(0).toUpperCase() + key.slice(1)}
            >
              {typeof value === 'object' ? (
                <TextArea rows={3} />
              ) : (
                <Input />
              )}
            </Form.Item>
          ))}
        </Form>

        <Divider />

        <Card title="Submit Configuration" size="small">
          <Form layout="vertical">
            <Form.Item label="Method">
              <Select
                value={submitConfig.method}
                onChange={(value) => setSubmitConfig(prev => ({ ...prev, method: value }))}
              >
                <Option value="POST">POST</Option>
                <Option value="PUT">PUT</Option>
                <Option value="PATCH">PATCH</Option>
              </Select>
            </Form.Item>
            <Form.Item label="Submit URL">
              <Input
                value={submitConfig.url}
                onChange={(e) => setSubmitConfig(prev => ({ ...prev, url: e.target.value }))}
                placeholder="Enter submit URL"
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                onClick={() => handleFormSubmit()}
                disabled={!submitConfig.url}
              >
                Submit
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    );
  };

  // 处理表单提交
  const handleFormSubmit = async () => {
    if (!submitConfig.url) return;

    try {
      const response = await fetch(submitConfig.url, {
        method: submitConfig.method,
        headers: {
          'Content-Type': 'application/json',
          ...submitConfig.headers,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      console.log('Form submitted successfully:', result);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const tabItems = [
    {
      key: 'response',
      label: 'Response',
      children: response ? (
        <div>
          {renderStatus(response)}
          <Divider />
          {response.error ? (
            <Alert
              message="Request Failed"
              description={<pre>{JSON.stringify(response.data, null, 2)}</pre>}
              type="error"
              style={{ marginBottom: '16px' }}
            />
          ) : (
            <pre style={{
              background: '#f5f5f5',
              padding: '12px',
              borderRadius: '4px',
              maxHeight: '400px',
              overflow: 'auto'
            }}>
              {JSON.stringify(response.data, null, 2)}
            </pre>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <Text>No response yet. Click "Run" to send a request.</Text>
        </div>
      ),
    },
    {
      key: 'headers',
      label: 'Headers',
      children: response?.headers ? (
        <Descriptions
          items={Object.entries(response.headers).map(([key, value], index) => ({
            key: index.toString(),
            label: key,
            children: String(value),
          }))}
          column={1}
          size="small"
        />
      ) : (
        <Text type="secondary">No headers</Text>
      ),
    },
    {
      key: 'schema',
      label: 'Schema',
      children: response && !response.error ? (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <Text type="secondary">
              Data fields extracted from {response.transformedData !== undefined ? 'transformed' : 'raw'} response
            </Text>
          </div>
          
          {(() => {
            const dataToUse = response.transformedData !== undefined ? response.transformedData : response.data;
            const schema = generateSchema(dataToUse);
            
            if (schema.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  <Text>No schema available for this response</Text>
                </div>
              );
            }
            
            return (
              <Table
                columns={[
                  {
                    title: 'Field',
                    dataIndex: 'field',
                    key: 'field',
                    width: 150,
                  },
                  {
                    title: 'Type',
                    dataIndex: 'type',
                    key: 'type',
                    width: 100,
                    render: (type: string) => (
                      <Tag color={
                        type === 'string' ? 'blue' :
                        type === 'number' ? 'green' :
                        type === 'boolean' ? 'orange' :
                        type === 'object' ? 'purple' :
                        type === 'array' ? 'cyan' : 'default'
                      }>
                        {type}
                      </Tag>
                    ),
                  },
                  {
                    title: 'Value',
                    dataIndex: 'value',
                    key: 'value',
                    render: (value: any) => (
                      <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {String(value).length > 50 ? String(value).substring(0, 50) + '...' : String(value)}
                        </Text>
                      </div>
                    ),
                  },
                  {
                    title: 'Path',
                    dataIndex: 'path',
                    key: 'path',
                    render: (path: string) => (
                      <Text type="secondary" style={{ fontSize: '12px' }}>{path}</Text>
                    ),
                  },
                  {
                    title: 'Action',
                    key: 'action',
                    width: 100,
                    render: (record: { field: string; type: string; value: any; path: string }) => (
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => handleCreateVariable(record)}
                      >
                        Create Variable
                      </Button>
                    ),
                  },
                ]}
                dataSource={schema}
                pagination={{ pageSize: 10, size: 'small' }}
                size="small"
                scroll={{ x: true }}
              />
            );
          })()}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <Text>No response data available</Text>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Title level={5}>Response</Title>
        {response && !response.error && (
          <Dropdown menu={{ items: displayMenuItems }} trigger={['click']}>
            <Button>
              Display on UI <DownOutlined />
            </Button>
          </Dropdown>
        )}
      </div>

      <Tabs items={tabItems} size="small" />
    </div>
  );
};

export default ApiResponsePanel;
