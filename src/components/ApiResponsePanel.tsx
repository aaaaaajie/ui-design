import React, { useState } from 'react';
import {
  Typography,
  Card,
  Tabs,
  Button,
  Table,
  Descriptions,
  Form,
  Input,
  Space,
  Tag,
  Divider,
  Alert,
  Select,
  Popover
} from 'antd';
import { TableOutlined, FileTextOutlined, FormOutlined, FilterOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// 新增：筛选条件类型声明
export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'isEmpty'
  | 'isNotEmpty';

export interface Condition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string; // 空值类操作符不使用该值
}

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
  // 新增：显示模式，默认 table
  const [displayMode, setDisplayMode] = useState<'table' | 'detail' | 'form'>('table');
  
  // 新增：处理显示模式切换
  const handleDisplayMode = (mode: 'table' | 'detail' | 'form') => {
    setDisplayMode(mode);
    if (!response || response.error || !onDisplayUI) return;
    const dataToUse = response.transformedData !== undefined ? response.transformedData : response.data;
    onDisplayUI(renderByMode(mode, dataToUse));
  };

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
    const pagingMode: 'noco' | 'api' = mapping.pagingMode || 'api';

    // NocoBase 分页：忽略响应中的分页字段，用数据长度做 total
    if (pagingMode === 'noco') {
      const dataToUse = (response.transformedData !== undefined ? response.transformedData : response.data);
      let total = 0;
      if (Array.isArray(dataToUse)) total = dataToUse.length;
      else if (dataToUse && typeof dataToUse === 'object') total = 1; // 对象视作单条
      const newPagination = { ...pagination, total };
      setPagination(newPagination);
      return;
    }

    const respFields = mapping.responseFields || {};
    const data = response.data;

    if (!data || typeof data !== 'object') return;

    const newPagination = { ...pagination };

    // 原有 API 分页逻辑
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
    setPagination(newPagination);
  };

  // 获取嵌套对象的值
  const getNestedValue = (obj: any, path: string): any => {
    if (!path) return undefined;
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  // 处理分页变化
  const handleTablePaginationChange = (page: number, pageSize: number) => {
    const mapping = response?.paginationMapping || {};
    const pagingMode: 'noco' | 'api' = mapping.pagingMode || 'api';

    const newPagination = { ...pagination, current: page, pageSize };
    setPagination(newPagination);

    if (onPaginationChange) {
      onPaginationChange({ current: page, pageSize });
    }

    if (pagingMode === 'api') {
      // API 分页才触发请求（Noco 模式通过外层 pagination 变更联动请求）
      if (onTriggerRequest) {
        setTimeout(() => {
          onTriggerRequest();
        }, 100);
      }
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
    onDisplayUI(renderByMode(displayMode, dataToUse));
  }, [response, pagination.current, pagination.pageSize, displayMode]);

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

  // ==== 与筛选相关的通用工具函数（供子组件复用） ====
  function getFieldsFromData(data: any): string[] {
    if (!data) return [];
    const sample = Array.isArray(data) ? data[0] : data;
    if (sample && typeof sample === 'object') return Object.keys(sample);
    return ['value'];
  }

  function coerceForCompare(a: any, b: string): { a: any; b: any } {
    const bn = Number(b);
    if (b !== '' && !Number.isNaN(bn)) {
      const an = Number(a);
      if (!Number.isNaN(an)) return { a: an, b: bn };
    }
    return { a: String(a ?? ''), b: b };
  }

  function applyConditionsToItem(item: any, conds: Condition[], logic: 'all' | 'any'): boolean {
    if (!conds.length) return true;
    const results = conds.map(c => {
      const field = c.field ?? '';
      const op = c.operator ?? 'contains';
      const rawVal = c.value ?? '';
      const val = Array.isArray(item) ? item[0] : item;
      const left = (val && typeof val === 'object') ? (val as any)[field] : val;

      switch (op) {
        case 'equals': {
          const { a, b } = coerceForCompare(left, rawVal);
          return a === b;
        }
        case 'notEquals': {
          const { a, b } = coerceForCompare(left, rawVal);
          return a !== b;
        }
        case 'contains': {
          return String(left ?? '').toLowerCase().includes(String(rawVal).toLowerCase());
        }
        case 'notContains': {
          return !String(left ?? '').toLowerCase().includes(String(rawVal).toLowerCase());
        }
        case 'startsWith': {
          return String(left ?? '').toLowerCase().startsWith(String(rawVal).toLowerCase());
        }
        case 'endsWith': {
          return String(left ?? '').toLowerCase().endsWith(String(rawVal).toLowerCase());
        }
        case 'gt': {
          const { a, b } = coerceForCompare(left, rawVal);
          return a > b;
        }
        case 'gte': {
          const { a, b } = coerceForCompare(left, rawVal);
          return a >= b;
        }
        case 'lt': {
          const { a, b } = coerceForCompare(left, rawVal);
          return a < b;
        }
        case 'lte': {
          const { a, b } = coerceForCompare(left, rawVal);
          return a <= b;
        }
        case 'isEmpty':
          return left === undefined || left === null || String(left) === '';
        case 'isNotEmpty':
          return !(left === undefined || left === null || String(left) === '');
        default:
          return true;
      }
    });

    return logic === 'all' ? results.every(Boolean) : results.some(Boolean);
  }

  // 独立的可筛选表格视图，内部自管理筛选弹窗与条件，确保在 displayOnly 模式下也可正常交互
  const FilterableTableView: React.FC<{ data: any; pag: { current: number; pageSize: number; showSizeChanger: boolean }; onPageChange?: (page: number, pageSize: number) => void; mode?: 'noco' | 'api'; apiTotal?: number; }>
    = ({ data, pag, onPageChange, mode = 'api', apiTotal }) => {
      const [visible, setVisible] = useState(false);
      const [logic, setLogic] = useState<'all' | 'any'>('all');
      const [conds, setConds] = useState<Condition[]>([]);

      const fields = getFieldsFromData(data);

      const filtered = React.useMemo(() => {
        if (!conds.length) return data;
        if (Array.isArray(data)) return data.filter(item => applyConditionsToItem(item, conds, logic));
        if (data && typeof data === 'object') return applyConditionsToItem(data, conds, logic) ? data : [];
        return data;
      }, [data, conds, logic]);

      // 本地计算总数（用于 Noco 模式或作为兜底）
      const localTotal = Array.isArray(filtered) ? filtered.length : (filtered && typeof filtered === 'object' ? 1 : 0);
      // 在 API 分页模式下：若从响应解析得到的 total 有效（>0），优先使用；否则回退到本地总数
      const hasValidApiTotal = typeof apiTotal === 'number' && apiTotal > 0;
      const total = mode === 'api' && hasValidApiTotal ? (apiTotal as number) : localTotal;

      const operatorOptions = [
        { label: '等于', value: 'equals' },
        { label: '不等于', value: 'notEquals' },
        { label: '包含', value: 'contains' },
        { label: '不包含', value: 'notContains' },
        { label: '开头是', value: 'startsWith' },
        { label: '结尾是', value: 'endsWith' },
        { label: '大于', value: 'gt' },
        { label: '大于等于', value: 'gte' },
        { label: '小于', value: 'lt' },
        { label: '小于等于', value: 'lte' },
        { label: '为空', value: 'isEmpty' },
        { label: '不为空', value: 'isNotEmpty' },
      ];

      const addCond = () => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setConds(prev => ([...prev, { id, field: fields[0], operator: 'contains', value: '' }]));
      };

      const reset = () => { setConds([]); setLogic('all'); };
      const applyAndClose = () => { setVisible(false); };

      return (
        <div>
          <div style={{ marginBottom: 8 }}>
            <Popover
              trigger="click"
              placement="bottomLeft"
              open={visible}
              onOpenChange={(open) => setVisible(open)}
              getPopupContainer={() => document.body}
              overlayStyle={{ zIndex: 2000 }}
              content={(
                <div style={{ width: 360 }}>
                  <div style={{ marginBottom: 12 }}>
                    <Space size={8}>
                      <Text type="secondary">匹配逻辑</Text>
                      <Select size="small" value={logic} onChange={(v) => setLogic(v as 'all' | 'any')} style={{ width: 140 }}
                        options={[{ label: '全部匹配 (AND)', value: 'all' }, { label: '任一匹配 (OR)', value: 'any' }]} />
                    </Space>
                  </div>
                  <Space direction="vertical" style={{ width: '100%' }} size={8}>
                    {conds.map((c) => (
                      <Space key={c.id} align="start" wrap style={{ width: '100%' }}>
                        <Select size="small" value={c.field} style={{ minWidth: 120 }} onChange={(v) => setConds(prev => prev.map(x => x.id === c.id ? { ...x, field: v } : x))}>
                          {fields.map(f => <Option key={f} value={f}>{f}</Option>)}
                        </Select>
                        <Select size="small" value={c.operator} style={{ minWidth: 120 }} onChange={(v) => setConds(prev => prev.map(x => x.id === c.id ? { ...x, operator: v } : x))}>
                          {operatorOptions.map(op => <Option key={op.value} value={op.value}>{op.label}</Option>)}
                        </Select>
                        <Input size="small" placeholder="值" style={{ minWidth: 120 }} value={c.value}
                          onChange={(e) => setConds(prev => prev.map(x => x.id === c.id ? { ...x, value: e.target.value } : x))}
                          disabled={c.operator === 'isEmpty' || c.operator === 'isNotEmpty'} />
                        <Button size="small" danger onClick={() => setConds(prev => prev.filter(x => x.id !== c.id))}>删除</Button>
                      </Space>
                    ))}
                    {conds.length === 0 && (<Text type="secondary">暂无筛选条件，点击“新增条件”开始</Text>)}
                    <Divider style={{ margin: '8px 0' }} />
                    <Space>
                      <Button size="small" onClick={addCond} type="dashed">新增条件</Button>
                      <Button size="small" onClick={reset}>重置</Button>
                      <Button size="small" type="primary" onClick={applyAndClose}>应用</Button>
                    </Space>
                  </Space>
                </div>
              )}
            >
              <Button size="small" icon={<FilterOutlined />} onClick={() => setVisible(v => !v)}>Filter</Button>
            </Popover>
          </div>

          <Table
            columns={generateTableColumns(filtered)}
            dataSource={convertToTableData(filtered)}
            pagination={{
              current: pag.current,
              pageSize: pag.pageSize,
              pageSizeOptions: [5, 10, 20, 50, 100],
              total,
              showSizeChanger: pag.showSizeChanger,
              showQuickJumper: true,
              showTotal: (t, range) => `${range[0]}-${range[1]} of ${t} items`,
              onChange: onPageChange,
              onShowSizeChange: onPageChange,
            }}
            scroll={{ x: true }}
            size="small"
          />
        </div>
      );
    };

  // 抽取：根据模式返回对应组件
  const renderByMode = (mode: 'table' | 'detail' | 'form', dataToUse: any): React.ReactNode => {
    switch (mode) {
      case 'table': {
        const pagingMode: 'noco' | 'api' = (response?.paginationMapping?.pagingMode) || 'api';
        return (
          <FilterableTableView
            data={dataToUse}
            pag={{ current: pagination.current, pageSize: pagination.pageSize, showSizeChanger: pagination.showSizeChanger }}
            onPageChange={handleTablePaginationChange}
            mode={pagingMode}
            apiTotal={pagination.total}
          />
        );
      }
      case 'detail':
        return renderDetailView(dataToUse);
      case 'form':
        return renderFormView(dataToUse);
      default:
        return null;
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
          <Select
            size="small"
            value={displayMode}
            onChange={(v) => handleDisplayMode(v as 'table' | 'detail' | 'form')}
            style={{ width: 160 }}
          >
            <Select.Option value="table"><Space><TableOutlined />Table</Space></Select.Option>
            <Select.Option value="detail"><Space><FileTextOutlined />Detail</Space></Select.Option>
            <Select.Option value="form"><Space><FormOutlined />Form</Space></Select.Option>
          </Select>
        )}
      </div>

      <Tabs items={tabItems} size="small" />
    </div>
  );
};

export default ApiResponsePanel;
