import React from 'react';
import { Table, Tag, Checkbox, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';

export interface SchemaRow {
  key: string;
  field: string;
  type: string;
  value: any;
  path: string;
  children?: SchemaRow[];
}

export default function SchemaTable({
  schema,
  hoveredKey,
  setHoveredKey,
  selectedPaths,
  onTogglePath,
  aliasMap,
  onAliasChange,
}: {
  schema: SchemaRow[];
  hoveredKey: string | null;
  setHoveredKey: (k: string | null) => void;
  selectedPaths: string[];
  onTogglePath: (path: string, checked: boolean) => void;
  aliasMap: Record<string, string>;
  onAliasChange: (path: string, alias: string) => void;
}) {
  // 构造树形数据：顶层 schema 行 + 子属性行
  const treeData = React.useMemo(() => {
    const isRealObject = (v: any) => v !== null && typeof v === 'object' && !Array.isArray(v);
    return schema.map((rec) => {
      if (rec.type !== 'array' && rec.type !== 'object') return rec;
      let childEntries: SchemaRow[] = [];
      try {
        const parsed = (() => {
          if (typeof rec.value === 'string') {
            try {
              return JSON.parse(rec.value);
            } catch {
              return rec.value;
            }
          }
          return rec.value;
        })();
        const sample = Array.isArray(parsed) ? parsed.find((x: any) => isRealObject(x)) : parsed;
        if (isRealObject(sample)) {
          childEntries = Object.entries(sample).map(([k, v], i) => ({
            key: `${rec.path}.${k}-${i}`,
            field: k,
            type: Array.isArray(v) ? 'array' : (v !== null && typeof v === 'object') ? 'object' : typeof v,
            value: v,
            path: `${rec.path}.${k}`,
          }));
        }
      } catch {}
      return { ...rec, children: childEntries } as SchemaRow;
    });
  }, [schema]);

  // 默认选中：所有顶层非嵌套字段（object/array 除外），子属性默认不勾选
  React.useEffect(() => {
    const defaults = treeData
      .filter((r) => r.type !== 'array' && r.type !== 'object')
      .map((r) => r.path);
    if (defaults.length) {
      // 将默认项并入已选，不覆盖已有选择
      const set = new Set(selectedPaths);
      defaults.forEach((p) => set.add(p));
      if (set.size !== selectedPaths.length) {
        // 只有变化时才触发 onTogglePath 多次以复用父状态逻辑
        set.forEach((p) => {
          if (!selectedPaths.includes(p)) onTogglePath(p, true);
        });
      }
    }
    // 仅在初次加载 schema 时触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeData.length]);

  const columns: ColumnsType<SchemaRow> = [
    {
      title: 'Select',
      dataIndex: 'select',
      key: 'select',
      width: 80,
      render: (_: any, record) => (
        <Checkbox
          checked={selectedPaths.includes(record.path)}
          onChange={(e) => onTogglePath(record.path, e.target.checked)}
        />
      ),
    },
    { title: 'Field', dataIndex: 'field', key: 'field', width: 150 },
    {
      title: 'Alias Field',
      dataIndex: 'alias',
      key: 'alias',
      width: 150,
      render: (_: any, record) => (
        <Input
          size="small"
          value={aliasMap[record.path] || ''}
          onChange={(e) => onAliasChange(record.path, e.target.value)}
        />
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 150,
      render: (type: string) => (
        <Tag
          color={
            type === 'string'
              ? 'blue'
              : type === 'number'
              ? 'green'
              : type === 'boolean'
              ? 'orange'
              : type === 'object'
              ? 'purple'
              : type === 'array'
              ? 'cyan'
              : 'default'
          }
        >
          {type}
        </Tag>
      ),
    }
  ];

  return (
    <Table
      columns={columns}
      dataSource={treeData}
      pagination={{ pageSize: 10, size: 'small' }}
      size="small"
      scroll={{ x: true }}
      expandable={{
        defaultExpandAllRows: false,
        rowExpandable: (rec) => rec.type === 'array' || rec.type === 'object',
      }}
      onRow={(rec: any) => ({
        onMouseEnter: () => setHoveredKey(rec.key),
        onMouseLeave: () => {
          if (hoveredKey === rec.key) setHoveredKey(null);
        },
      })}
    />
  );
}
