import { Table, Tag, Typography, Dropdown, Button } from 'antd';

const { Text } = Typography;

export interface SchemaRow {
  key: string;
  field: string;
  type: string;
  value: any;
  path: string;
}

export default function SchemaTable({
  schema,
  hoveredKey,
  setHoveredKey,
  onCreateVariable,
  onExtract,
}: {
  schema: SchemaRow[];
  hoveredKey: string | null;
  setHoveredKey: (k: string | null) => void;
  onCreateVariable: (record: SchemaRow) => void;
  onExtract: (record: SchemaRow) => void;
}) {
  return (
    <Table
      columns={[
        { title: 'Field', dataIndex: 'field', key: 'field', width: 150 },
        {
          title: 'Type',
          dataIndex: 'type',
          key: 'type',
          width: 100,
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
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {path}
            </Text>
          ),
        },
        {
          title: 'Action',
          key: 'action',
          width: 80,
          render: (record: SchemaRow) => {
            const menuItems = [
              { key: 'createVar', label: '创建变量' },
              { key: 'extract', label: '提取字段' },
            ];
            const onMenuClick = ({ key }: { key: string }) => {
              if (key === 'createVar') onCreateVariable(record);
              if (key === 'extract') onExtract(record);
            };
            return (
              <div style={{ textAlign: 'right' }}>
                {hoveredKey === record.key ? (
                  <Dropdown placement="bottomRight" menu={{ items: menuItems, onClick: onMenuClick }}>
                    <Button size="small" type="text">
                      ···
                    </Button>
                  </Dropdown>
                ) : null}
              </div>
            );
          },
        },
      ]}
      dataSource={schema}
      pagination={{ pageSize: 10, size: 'small' }}
      size="small"
      scroll={{ x: true }}
      onRow={(rec: any) => ({
        onMouseEnter: () => setHoveredKey(rec.key),
        onMouseLeave: () => {
          if (hoveredKey === rec.key) setHoveredKey(null);
        },
      })}
    />
  );
}
