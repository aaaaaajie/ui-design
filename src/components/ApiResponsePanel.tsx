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
  config?: any;
  timestamp?: string;
  error?: boolean;
}

interface ApiResponsePanelProps {
  blockId: string;
  response?: ResponseData | null;
  onDisplayUI?: (component: React.ReactNode) => void;
}

const ApiResponsePanel: React.FC<ApiResponsePanelProps> = ({ response, onDisplayUI }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitConfig, setSubmitConfig] = useState({
    method: 'POST',
    url: '',
    headers: {} as Record<string, string>,
  });

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
            pagination={{ pageSize: 10 }}
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
