import React, { useState } from 'react';
import { Typography, Tabs, Descriptions, Divider, Alert, Select } from 'antd';
import { TableOutlined, FileTextOutlined, FormOutlined } from '@ant-design/icons';
import { StatusTag, SchemaTable } from './api-response';
import renderByMode from './api-response/DisplayModes';
import type { ApiResponsePanelProps, ResponseData } from './api-response/types';
import { getNestedValue, normalizeResponsePath, toNumber } from './api-response/utils';

const { Title, Text } = Typography;

// 生成数据字段schema（value 保存原始值，便于展开子属性）
const generateSchema = (
  data: any,
  prefix: string = ''
): Array<{ key: string; field: string; type: string; value: any; path: string }> => {
  const schema: Array<{ key: string; field: string; type: string; value: any; path: string }> = [];

  // 工具：判定“真正的对象”（排除 null 与数组）
  const isRealObject = (v: any) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const typeOf = (v: any): string => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);

  if (!data) return schema;

  const processObject = (obj: any, currentPrefix: string) => {
    if (!isRealObject(obj)) return;
    Object.entries(obj).forEach(([key, value], index) => {
      const path = currentPrefix ? `${currentPrefix}.${key}` : key;
      const fieldType = typeOf(value);

      schema.push({
        key: `${currentPrefix}-${key}-${index}`,
        field: key,
        type: fieldType,
        value, // 保留原始值
        path,
      });
    });
  };

  if (Array.isArray(data) && data.length > 0) {
    // 仅在数组中找到首个“真正的对象”时再展开其字段
    const firstObj = data.find((it: any) => isRealObject(it));
    if (firstObj) processObject(firstObj, prefix);
  } else if (isRealObject(data)) {
    processObject(data, prefix);
  }

  return schema;
};

const ApiResponsePanel: React.FC<ApiResponsePanelProps> = ({ response, onDisplayUI, onPaginationChange, initialSelectedPaths, initialAliasMap, onSchemaChange, onSorterChange }) => {
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0, showSizeChanger: true });
  const [displayMode, setDisplayMode] = useState<'table' | 'detail' | 'form'>('table');
  const [hoveredSchemaKey, setHoveredSchemaKey] = useState<string | null>(null);
  // 新增：选中用于展示到 UI 的字段路径（支持 a、a.b、a.b.c 等）
  const [selectedPaths, setSelectedPaths] = useState<string[]>(initialSelectedPaths || []);
  // 新增：字段别名
  const [aliasMap, setAliasMap] = useState<Record<string, string>>(initialAliasMap || {});

  // 同步外部传入的初始值（当 block 切换等场景）
  React.useEffect(() => {
    if (initialSelectedPaths) setSelectedPaths(initialSelectedPaths);
  }, [initialSelectedPaths]);
  React.useEffect(() => {
    if (initialAliasMap) setAliasMap(initialAliasMap);
  }, [initialAliasMap]);

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
        selectedPaths,
        aliasMap,
        // 新增：排序回调
        onSorterChange: (s) => {
          onSorterChange?.(s);
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

  // 新增：响应、分页或选择字段改变时，自动将表格渲染到 UI Display
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
        selectedPaths,
        aliasMap,
        // 新增：排序回调
        onSorterChange: (s) => {
          onSorterChange?.(s);
        },
      })
    );
  }, [response, pagination.current, pagination.pageSize, displayMode, selectedPaths, aliasMap]);

  // Schema 勾选项切换
  const handleTogglePath = (path: string, checked: boolean) => {
    setSelectedPaths((prev) => {
      const set = new Set(prev);
      if (checked) set.add(path);
      else set.delete(path);
      const next = Array.from(set);
      onSchemaChange?.({ selectedPaths: next, aliasMap });
      return next;
    });
  };

  // 别名变更
  const handleAliasChange = (path: string, alias: string) => {
    setAliasMap((prev) => {
      const next = { ...prev, [path]: alias };
      onSchemaChange?.({ selectedPaths, aliasMap: next });
      return next;
    });
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
                selectedPaths={selectedPaths}
                onTogglePath={handleTogglePath}
                aliasMap={aliasMap}
                onAliasChange={handleAliasChange}
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
    </div>
  );
};

export default ApiResponsePanel;
