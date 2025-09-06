import React, { useState } from 'react';
import { Typography, Tabs, Descriptions, Divider, Alert, Select, message } from 'antd';
import { TableOutlined, FileTextOutlined, FormOutlined } from '@ant-design/icons';
import { StatusTag, SchemaTable, ExtractModal } from './api-response';
import renderByMode from './api-response/DisplayModes';
import type { ApiResponsePanelProps, ResponseData } from './api-response/types';
import { getNestedValue, normalizeResponsePath, toNumber, getRootFields, getChildFields } from './api-response/utils';

const { Title, Text } = Typography;

// 生成数据字段schema
const generateSchema = (
  data: any,
  prefix: string = ''
): Array<{ key: string; field: string; type: string; value: any; path: string }> => {
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
        path: path,
      });

      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        processObject(value, path);
      }
    });
  };

  if (Array.isArray(data) && data.length > 0) {
    processObject(data[0], prefix);
  } else {
    processObject(data, prefix);
  }

  return schema;
};

const ApiResponsePanel: React.FC<ApiResponsePanelProps> = ({ response, onDisplayUI, onCreateVariable, onPaginationChange }) => {
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0, showSizeChanger: true });
  const [displayMode, setDisplayMode] = useState<'table' | 'detail' | 'form'>('table');
  const [hoveredSchemaKey, setHoveredSchemaKey] = useState<string | null>(null);
  const [extractModalOpen, setExtractModalOpen] = useState(false);
  const [extractedPath, setExtractedPath] = useState<string>('');
  const [extractBaseData, setExtractBaseData] = useState<any>(null);
  const [rootFieldOptions, setRootFieldOptions] = useState<string[]>([]);
  const [childFieldOptions, setChildFieldOptions] = useState<string[]>([]);
  const [selectedRootFields, setSelectedRootFields] = useState<string[]>([]);
  const [selectedChildFields, setSelectedChildFields] = useState<string[]>([]);

  // 从响应数据中提取分页信息（支持自定义响应字段路径）
  const extractPaginationFromResponse = (resp: ResponseData) => {
    if (!resp || resp.error) return;

    const mapping = resp.paginationMapping || {};
    const pagingMode: 'noco' | 'api' = mapping.pagingMode || 'api';

    // NocoBase 分页：忽略响应中的分页字段，用数据长度做 total
    if (pagingMode === 'noco') {
      const dataToUse = resp.transformedData !== undefined ? resp.transformedData : resp.data;
      let total = 0;
      if (Array.isArray(dataToUse)) total = dataToUse.length;
      else if (dataToUse && typeof dataToUse === 'object') total = 1; // 对象视作单条
      const newPagination = { ...pagination, total };
      setPagination(newPagination);
      return;
    }

    const respFields = mapping.responseFields || {};
    const data = resp.data;

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

  // 新增：获取根层字段（用于外层保留）
  // const getRootFields = (data: any): string[] => {
  //   if (!data) return [];
  //   const sample = Array.isArray(data) ? data[0] : data;
  //   if (sample && typeof sample === 'object' && !Array.isArray(sample)) return Object.keys(sample);
  //   return [];
  // };

  // 新增：获取子字段（从提取对象/数组样本）
  // const getChildFields = (val: any): string[] => {
  //   if (!val) return [];
  //   if (Array.isArray(val)) {
  //     const first = val[0];
  //     if (first && typeof first === 'object' && !Array.isArray(first)) return Object.keys(first);
  //     return [];
  //   }
  //   if (typeof val === 'object') return Object.keys(val);
  //   return [];
  // };

  // 新增：获取子字段值（支持数组对象，取第一个元素）
  // const getProjectedChildValue = (item: any, basePath: string, childKey: string) => {
  //   const sub = getNestedValue(item, basePath);
  //   if (Array.isArray(sub)) {
  //     const first = sub[0];
  //     if (first && typeof first === 'object') return first?.[childKey];
  //     try { return JSON.stringify(sub); } catch { return String(sub); }
  //   }
  //   if (sub && typeof sub === 'object') return sub?.[childKey];
  //   return undefined;
  // };

  // 新增：根据选择投影数据
  // const projectSelected = (data: any, rootSel: string[], childSel: string[], path: string) => {
  //   const makeRow = (src: any, idx: number) => {
  //     const row: any = { key: idx };
  //     rootSel.forEach((f) => { row[f] = getNestedValue(src, f); });
  //     childSel.forEach((cf) => { row[`${path}.${cf}`] = getProjectedChildValue(src, path, cf); });
  //     return row;
  //   };

  //   if (Array.isArray(data)) {
  //     return data.map((item, idx) => (item && typeof item === 'object') ? makeRow(item, idx) : { key: idx });
  //   }
  //   if (data && typeof data === 'object') {
  //     return [makeRow(data, 0)];
  //   }
  //   return [];
  // };

  // 新增：处理显示模式切换
  const handleDisplayMode = (mode: 'table' | 'detail' | 'form') => {
    setDisplayMode(mode);
    if (!response || response.error || !onDisplayUI) return;
    const dataToUse = response.transformedData !== undefined ? response.transformedData : response.data;
    onDisplayUI(
      renderByMode(mode, dataToUse, {
        tablePagination: pagination,
        onTableChange: ({ current, pageSize }) => {
          setPagination((prev) => ({ ...prev, current, pageSize }));
          onPaginationChange?.({ current, pageSize });
        },
      })
    );
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
    onDisplayUI(
      renderByMode(displayMode, dataToUse, {
        tablePagination: pagination,
        onTableChange: ({ current, pageSize }) => {
          setPagination((prev) => ({ ...prev, current, pageSize }));
          onPaginationChange?.({ current, pageSize });
        },
      })
    );
  }, [response, pagination.current, pagination.pageSize, displayMode]);

  // 处理创建变量
  const handleCreateVariable = (fieldData: { field: string; type: string; value: any; path: string }) => {
    if (onCreateVariable) {
      onCreateVariable({ name: fieldData.field, value: fieldData.value, type: fieldData.type, source: fieldData.path });
      message.success('已创建变量');
    }
  };

  // 新增：提取嵌套数据（增强：初始化选项与默认选择）
  const handleExtractData = (fieldData: { field: string; type: string; value: any; path: string }) => {
    const dataToUse = response?.transformedData !== undefined ? response?.transformedData : response?.data;
    if (!dataToUse) return;

    const value = getNestedValue(dataToUse, fieldData.path);
    setExtractBaseData(dataToUse);
    setExtractedPath(fieldData.path);

    const roots = getRootFields(dataToUse);
    const childs = getChildFields(value);

    setRootFieldOptions(roots);
    setChildFieldOptions(childs);
    // 默认勾选常见 id 字段
    setSelectedRootFields(roots.includes('id') ? ['id'] : []);
    setSelectedChildFields([]);

    setExtractModalOpen(true);
    // 仅在进入弹窗时不主动刷新右侧 UI，等用户点击“应用到 UI”
  };

  // tab 页签
  const tabItems = [
    {
      key: 'response',
      label: 'Response',
      children: response ? (
        <div>
          <StatusTag resp={response} />
          <Divider />
          {response.error ? (
            <Alert
              message="Request Failed"
              description={<pre>{JSON.stringify(response.data, null, 2)}</pre>}
              type="error"
              style={{ marginBottom: '16px' }}
            />
          ) : (
            <pre
              style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', maxHeight: '400px', overflow: 'auto' }}
            >
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
          items={Object.entries(response.headers).map(([key, value], index) => ({ key: index.toString(), label: key, children: String(value) }))}
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
              <SchemaTable
                schema={schema as any}
                hoveredKey={hoveredSchemaKey}
                setHoveredKey={setHoveredSchemaKey}
                onCreateVariable={handleCreateVariable}
                onExtract={handleExtractData}
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
          <Select size="small" value={displayMode} onChange={(v) => handleDisplayMode(v as 'table' | 'detail' | 'form')} style={{ width: 160 }}>
            <Select.Option value="table">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <TableOutlined />Table
              </span>
            </Select.Option>
            <Select.Option value="detail">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <FileTextOutlined />Detail
              </span>
            </Select.Option>
            <Select.Option value="form">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <FormOutlined />Form
              </span>
            </Select.Option>
          </Select>
        )}
      </div>

      <Tabs items={tabItems} size="small" />

      <ExtractModal
        open={extractModalOpen}
        extractedPath={extractedPath}
        extractBaseData={extractBaseData}
        rootFieldOptions={rootFieldOptions}
        childFieldOptions={childFieldOptions}
        selectedRootFields={selectedRootFields}
        selectedChildFields={selectedChildFields}
        onChangeRootFields={(vals) => setSelectedRootFields(vals)}
        onChangeChildFields={(vals) => setSelectedChildFields(vals)}
        onClose={() => setExtractModalOpen(false)}
        onApply={(full) => {
          if (onDisplayUI)
            onDisplayUI(
              renderByMode('table', full, {
                tablePagination: pagination,
                onTableChange: ({ current, pageSize }) => {
                  setPagination((prev) => ({ ...prev, current, pageSize }));
                  onPaginationChange?.({ current, pageSize });
                },
              })
            );
          setExtractModalOpen(false);
        }}
      />
    </div>
  );
};

export default ApiResponsePanel;
