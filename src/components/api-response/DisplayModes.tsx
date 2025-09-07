import React from 'react';
import { Table, Descriptions, Form, Input, Button, Modal, Select, Radio, Space, Divider } from 'antd';
import { generateTableColumns, normalizeToArray, generateSelectedColumns, getNestedValue } from './utils';

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

    // 内部组件：带 Filter 的表格
    const TableWithFilter: React.FC<{ rows: any[]; columns: any[] }> = ({ rows, columns }) => {
      const [open, setOpen] = React.useState(false);
      const [matchMode, setMatchMode] = React.useState<'all' | 'any'>('all');
      const [conditions, setConditions] = React.useState<Array<{ key: string; field?: string; op?: string; value?: string }>>([
        { key: 'c-0', field: undefined, op: 'contains', value: '' },
      ]);
      const [applied, setApplied] = React.useState<{ matchMode: 'all' | 'any'; conditions: Array<{ field?: string; op?: string; value?: string }> } | null>(null);

      // 从列推导可选字段
      const fieldOptions = React.useMemo(() => {
        return (columns || [])
          .map((c: any) => {
            const value = (c?.key ?? c?.dataIndex ?? '') as string;
            if (!value) return null;
            // 标题可能是 ReactElement
            const titleText = typeof c?.title === 'string' ? c.title : (c?.title?.props?.title || c?.title?.props?.children || value);
            return { label: String(titleText), value };
          })
          .filter(Boolean) as Array<{ label: string; value: string }>;
      }, [columns]);

      const addCondition = () => {
        setConditions((prev) => [...prev, { key: `c-${prev.length}`, field: undefined, op: 'contains', value: '' }]);
      };
      const removeCondition = (key: string) => {
        setConditions((prev) => prev.filter((c) => c.key !== key));
      };
      const updateCondition = (key: string, patch: Partial<{ field?: string; op?: string; value?: string }>) => {
        setConditions((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
      };

      // 获取行的字段值（支持 a.b 与 a.b.c，数组对象取首个）
      const getCellValue = (row: any, path?: string) => {
        if (!path) return undefined;
        if (path.includes('.')) {
          const segs = path.split('.');
          const basePath = segs.slice(0, -1).join('.');
          const childKey = segs[segs.length - 1];
          const base = getNestedValue(row, basePath);
          if (Array.isArray(base)) {
            const first = base[0];
            if (first && typeof first === 'object') return first?.[childKey];
            return base?.[0];
          }
          return getNestedValue(row, path);
        }
        return row?.[path];
      };

      const isEmpty = (v: any) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

      const matchByOp = (val: any, op: string | undefined, condVal: string | undefined) => {
        const opKey = op || 'contains';
        if (opKey === 'empty') return isEmpty(val);
        if (opKey === 'not_empty') return !isEmpty(val);
        const vStr = val === undefined || val === null ? '' : String(val);
        const cStr = condVal === undefined || condVal === null ? '' : String(condVal);
        const vNum = Number(vStr);
        const cNum = Number(cStr);
        const bothNum = Number.isFinite(vNum) && Number.isFinite(cNum);
        switch (opKey) {
          case 'equals':
            return bothNum ? vNum === cNum : vStr.toLowerCase() === cStr.toLowerCase();
          case 'not_equals':
            return bothNum ? vNum !== cNum : vStr.toLowerCase() !== cStr.toLowerCase();
          case 'starts_with':
            return vStr.toLowerCase().startsWith(cStr.toLowerCase());
          case 'ends_with':
            return vStr.toLowerCase().endsWith(cStr.toLowerCase());
          case 'gt':
            return bothNum && vNum > cNum;
          case 'gte':
            return bothNum && vNum >= cNum;
          case 'lt':
            return bothNum && vNum < cNum;
          case 'lte':
            return bothNum && vNum <= cNum;
          case 'contains':
          default:
            return vStr.toLowerCase().includes(cStr.toLowerCase());
        }
      };

      const filteredRows = React.useMemo(() => {
        if (!applied || !applied.conditions || applied.conditions.length === 0) return rows;
        const validConds = applied.conditions.filter((c) => c.field && c.op);
        if (validConds.length === 0) return rows;
        return rows.filter((row) => {
          const checks = validConds.map((c) => matchByOp(getCellValue(row, c.field), c.op, c.value));
          return applied.matchMode === 'all' ? checks.every(Boolean) : checks.some(Boolean);
        });
      }, [rows, applied]);

      return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              <Button icon={/* @ts-ignore */ undefined} size="small" onClick={() => setOpen(true)}>
                Filter
              </Button>
              {applied && (
                <Button size="small" style={{ marginLeft: 8 }} onClick={() => setApplied(null)}>
                  Reset
                </Button>
              )}
            </div>
          </div>

          <Table
            size="small"
            columns={columns}
            dataSource={filteredRows}
            pagination={{
              pageSize: options?.tablePagination?.pageSize ?? 10,
              current: options?.tablePagination?.current,
              total: options?.tablePagination?.total ?? filteredRows.length,
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

          <Modal
            title={
              <div>
                <span>Filter</span>
                <Divider type="vertical" />
                <span style={{ color: '#888' }}>Meet</span>
                <Radio.Group
                  size="small"
                  style={{ marginLeft: 8 }}
                  value={matchMode}
                  onChange={(e) => setMatchMode(e.target.value)}
                >
                  <Radio.Button value="all">All</Radio.Button>
                  <Radio.Button value="any">Any</Radio.Button>
                </Radio.Group>
                <span style={{ color: '#888', marginLeft: 8 }}>conditions in the group</span>
              </div>
            }
            open={open}
            onCancel={() => setOpen(false)}
            footer={
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button onClick={() => { setConditions([{ key: 'c-0', field: undefined, op: 'contains', value: '' }]); setMatchMode('all'); }}>Reset</Button>
                <Button type="primary" onClick={() => { setApplied({ matchMode, conditions: conditions.map(({ key, ...rest }) => rest) }); setOpen(false); }}>Submit</Button>
              </div>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {conditions.map((c) => (
                <div key={c.key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Select
                    style={{ width: 200 }}
                    placeholder="Select field"
                    showSearch
                    size="small"
                    options={fieldOptions}
                    value={c.field}
                    onChange={(v) => updateCondition(c.key, { field: v })}
                  />
                  <Select
                    style={{ width: 160 }}
                    placeholder="Comparison"
                    size="small"
                    value={c.op}
                    onChange={(v) => updateCondition(c.key, { op: v })}
                    options={[
                      { label: 'contains', value: 'contains' },
                      { label: 'equals', value: 'equals' },
                      { label: 'not equals', value: 'not_equals' },
                      { label: 'starts with', value: 'starts_with' },
                      { label: 'ends with', value: 'ends_with' },
                      { label: '>', value: 'gt' },
                      { label: '>=', value: 'gte' },
                      { label: '<', value: 'lt' },
                      { label: '<=', value: 'lte' },
                      { label: 'is empty', value: 'empty' },
                      { label: 'is not empty', value: 'not_empty' },
                    ]}
                  />
                  <Input
                    size="small"
                    style={{ width: 220 }}
                    placeholder="value"
                    disabled={c.op === 'empty' || c.op === 'not_empty'}
                    value={c.value}
                    onChange={(e) => updateCondition(c.key, { value: e.target.value })}
                  />
                  <Button size="small" type="text" onClick={() => removeCondition(c.key)}>×</Button>
                </div>
              ))}
              <Button size="small" onClick={addCondition}>+ Add condition</Button>
            </Space>
          </Modal>
        </div>
      );
    };

    return (
      <TableWithFilter rows={rows} columns={columns} />
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
