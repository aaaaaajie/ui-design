import React from 'react';
import { Table, Descriptions, Form, Input, Button } from 'antd';
import { generateTableColumns, normalizeToArray, generateSelectedColumns } from './utils';

export type DisplayMode = 'table' | 'detail' | 'form';

export default function renderByMode(
  mode: DisplayMode,
  rawData: any,
  options?: {
    tablePagination?: { current?: number; pageSize?: number; total?: number; showSizeChanger?: boolean };
    onTableChange?: (pgn: { current: number; pageSize: number }) => void;
    selectedPaths?: string[]; // 新增：仅展示勾选的字段（按传入顺序渲染）
    aliasMap?: Record<string, string>; // 新增：别名
    // 新增：排序变更回调
    onSorterChange?: (sorter: { field?: string; order?: 'ascend' | 'descend' | null }) => void;
    // 新增：排序模式（影响是否启用本地排序）
    sortMode?: 'noco' | 'api';
  }
): React.ReactNode {
  const rows = normalizeToArray(rawData);
  if (mode === 'table') {
    const enableLocalSorter = (options?.sortMode || 'noco') === 'noco';
    const columns = options?.selectedPaths && options.selectedPaths.length > 0
      ? generateSelectedColumns(options.selectedPaths, options.aliasMap, enableLocalSorter)
      : generateTableColumns(rows, enableLocalSorter);
    return (
      <Table
        size="small"
        columns={columns}
        dataSource={rows}
        pagination={{
          pageSize: options?.tablePagination?.pageSize ?? 10,
          current: options?.tablePagination?.current,
          total: options?.tablePagination?.total,
          showSizeChanger: options?.tablePagination?.showSizeChanger ?? true,
          size: 'small',
        }}
        scroll={{ x: true }}
        onChange={(pag: any, _filters: any, sorter: any) => {
          const current = (pag as any)?.current ?? 1;
          const pageSize = (pag as any)?.pageSize ?? 10;
          options?.onTableChange?.({ current, pageSize });

          // 归一化 sorter（支持单字段/多字段）
          const s = Array.isArray(sorter) ? sorter[0] : sorter;
          if (s) {
            const field: string | undefined = (typeof s.field === 'string' ? s.field : undefined) ||
              (typeof s.columnKey === 'string' ? s.columnKey : undefined);
            const order = (s.order ?? null) as 'ascend' | 'descend' | null;
            options?.onSorterChange?.({ field, order });
          } else {
            options?.onSorterChange?.({ field: undefined, order: null });
          }
        }}
      />
    );
  }
  if (mode === 'detail') {
    const obj = rows[0] || {};
    const entries = Object.entries(obj).filter(([k]) => k !== 'key');
    return (
      <Descriptions
        column={1}
        size="small"
        items={entries.map(([k, v], i) => ({ key: String(i), label: k, children: typeof v === 'object' ? JSON.stringify(v) : String(v) }))}
      />
    );
  }
  // form
  const obj = rows[0] || {};
  const entries = Object.entries(obj).filter(([k]) => k !== 'key');
  const safeInitial = Object.fromEntries(entries.map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)]));
  return (
    <Form layout="vertical" size="small" initialValues={safeInitial} onValuesChange={() => {}}>
      {entries.map(([k]) => (
        <Form.Item key={k} name={k} label={k}>
          <Input />
        </Form.Item>
      ))}
      <Button type="primary" disabled>
        Submit (disabled)
      </Button>
    </Form>
  );
}
