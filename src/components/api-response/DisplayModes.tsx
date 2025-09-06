import React from 'react';
import { Table, Descriptions, Form, Input, Button } from 'antd';
import { generateTableColumns, normalizeToArray } from './utils';

export type DisplayMode = 'table' | 'detail' | 'form';

export default function renderByMode(
  mode: DisplayMode,
  rawData: any,
  options?: {
    tablePagination?: { current?: number; pageSize?: number; total?: number; showSizeChanger?: boolean };
    onTableChange?: (pgn: { current: number; pageSize: number }) => void;
  }
): React.ReactNode {
  const rows = normalizeToArray(rawData);
  if (mode === 'table') {
    return (
      <Table
        size="small"
        columns={generateTableColumns(rows)}
        dataSource={rows}
        pagination={{
          pageSize: options?.tablePagination?.pageSize ?? 10,
          current: options?.tablePagination?.current,
          total: options?.tablePagination?.total,
          showSizeChanger: options?.tablePagination?.showSizeChanger ?? true,
          size: 'small',
        }}
        scroll={{ x: true }}
        onChange={(pag) => {
          const current = (pag as any)?.current ?? 1;
          const pageSize = (pag as any)?.pageSize ?? 10;
          options?.onTableChange?.({ current, pageSize });
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
