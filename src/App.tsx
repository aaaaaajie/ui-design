import { useState } from 'react';
import { Table, Cascader, Switch, Button, Space, message, Typography, Modal } from 'antd';
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import './App.css';

const { Title } = Typography;

interface DataType {
  key: string;
  fieldDisplayName: string;
  fieldName: string;
  fieldInterface: string[];
  titleField: boolean;
  description: string;
}

// 级联选择器的选项
const cascaderOptions = [
  {
    value: 'integer',
    label: '整数',
    children: [
      { value: 'bigInt', label: 'bigInt' },
      { value: 'tinyInt', label: 'tinyInt' },
      { value: 'integer', label: 'integer' },
    ],
  },
  {
    value: 'singleText',
    label: '单行文本',
    children: [
      { value: 'varchar', label: 'varchar' },
      { value: 'char', label: 'char' },
    ],
  },
  {
    value: 'multiText',
    label: '多行文本',
  },
];

function App() {
  const [messageApi, contextHolder] = message.useMessage();
  const [fieldInterfaceEditable, setFieldInterfaceEditable] = useState(false);

  const [dataSource, setDataSource] = useState<DataType[]>([
    {
      key: '1',
      fieldDisplayName: 'User ID',
      fieldName: 'user_id',
      fieldInterface: ['singleText', 'varchar'],
      titleField: false,
      description: '用户唯一标识符',
    },
    {
      key: '2',
      fieldDisplayName: 'Username',
      fieldName: 'username',
      fieldInterface: ['singleText', 'char'],
      titleField: false,
      description: '用户名称',
    },
    {
      key: '3',
      fieldDisplayName: 'Bio',
      fieldName: 'bio',
      fieldInterface: ['multiText'],
      titleField: false,
      description: '用户简介',
    },
    {
      key: '4',
      fieldDisplayName: 'Age',
      fieldName: 'age',
      fieldInterface: ['integer', 'integer'],
      titleField: false,
      description: '用户年龄',
    },
  ]);

  // 根据当前选择的值过滤可用选项
  const getFilteredOptions = (currentValue: string[]) => {
    if (!currentValue || currentValue.length === 0) {
      return cascaderOptions; // 如果没有选择，返回所有选项
    }

    const [firstLevel, secondLevel] = currentValue;

    // 如果是单行文本
    if (firstLevel === 'singleText') {
      if (secondLevel === 'varchar') {
        // varchar 不可以切换至 char，但可以切换至多行文本
        return [
          {
            value: 'singleText',
            label: '单行文本',
            children: [
              { value: 'varchar', label: 'varchar' }, // 保留当前选择
              { value: 'char', label: 'char', disabled: true }, // 禁用 char
            ],
          },
          {
            value: 'multiText',
            label: '多行文本',
          },
          // 整数选项不显示
        ];
      } else if (secondLevel === 'char') {
        // char 可以切换至 varchar 和多行文本
        return [
          {
            value: 'singleText',
            label: '单行文本',
            children: [
              { value: 'varchar', label: 'varchar' },
              { value: 'char', label: 'char' }, // 保留当前选择
            ],
          },
          {
            value: 'multiText',
            label: '多行文本',
          },
          // 整数选项不显示
        ];
      }
    }

    // 如果是整数
    if (firstLevel === 'integer') {
      if (secondLevel === 'tinyInt') {
        // tinyInt 可以切换至 integer 和 bigInt，也可以切换至单行文本和多行文本
        return [
          {
            value: 'integer',
            label: '整数',
            children: [
              { value: 'bigInt', label: 'bigInt' },
              { value: 'tinyInt', label: 'tinyInt' }, // 保留当前选择
              { value: 'integer', label: 'integer' },
            ],
          },
          {
            value: 'singleText',
            label: '单行文本',
            children: [
              { value: 'varchar', label: 'varchar' },
              { value: 'char', label: 'char' },
            ],
          },
          {
            value: 'multiText',
            label: '多行文本',
          },
        ];
      } else if (secondLevel === 'integer') {
        // integer 可以切换至 bigInt，但不可以切换 tinyInt，也可以切换至单行文本和多行文本
        return [
          {
            value: 'integer',
            label: '整数',
            children: [
              { value: 'bigInt', label: 'bigInt' },
              { value: 'tinyInt', label: 'tinyInt', disabled: true }, // 禁用 tinyInt
              { value: 'integer', label: 'integer' }, // 保留当前选择
            ],
          },
          {
            value: 'singleText',
            label: '单行文本',
            children: [
              { value: 'varchar', label: 'varchar' },
              { value: 'char', label: 'char' },
            ],
          },
          {
            value: 'multiText',
            label: '多行文本',
          },
        ];
      } else if (secondLevel === 'bigInt') {
        // bigInt 不可以切换其他两种整数类型，但可以切换至单行文本和多行文本
        return [
          {
            value: 'integer',
            label: '整数',
            children: [
              { value: 'bigInt', label: 'bigInt' }, // 保留当前选择
              { value: 'tinyInt', label: 'tinyInt', disabled: true }, // 禁用 tinyInt
              { value: 'integer', label: 'integer', disabled: true }, // 禁用 integer
            ],
          },
          {
            value: 'singleText',
            label: '单行文本',
            children: [
              { value: 'varchar', label: 'varchar' },
              { value: 'char', label: 'char' },
            ],
          },
          {
            value: 'multiText',
            label: '多行文本',
          },
        ];
      }
    }

    // 如果是多行文本，不能切换到其他类型
    if (firstLevel === 'multiText') {
      return [
        {
          value: 'multiText',
          label: '多行文本', // 只保留当前选择
        },
        // 整数和单行文本选项都不显示
      ];
    }

    return cascaderOptions; // 默认返回所有选项
  };

  const selectFieldInterface = (key: string, value: string[]) => {
    setDataSource(prev =>
      prev.map(item =>
        item.key === key ? { ...item, fieldInterface: value } : item
      )
    );
    messageApi.info(`选择了字段接口: ${value.join(' -> ')}`);
  };

  const toggleTitleField = (key: string, checked: boolean) => {
    setDataSource(prev =>
      prev.map(item =>
        item.key === key ? { ...item, titleField: checked } : item
      )
    );
    messageApi.success(`${checked ? '开启' : '关闭'}了标题字段`);
  };

  const handleEdit = (key: string) => {
    const record = dataSource.find(item => item.key === key);
    messageApi.success(`编辑字段: ${record?.fieldDisplayName}`);
  };

  const handleDelete = (key: string) => {
    const record = dataSource.find(item => item.key === key);
    setDataSource(prev => prev.filter(item => item.key !== key));
    messageApi.warning(`删除字段: ${record?.fieldDisplayName}`);
  };

  const handleFieldInterfaceEditableChange = (checked: boolean) => {
    console.log('开关状态变更:', checked, '当前状态:', fieldInterfaceEditable); // 调试日志
    if (checked) {
      Modal.confirm({
        title: '数据库字段类型编辑警告',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>启用字段接口编辑功能可能会导致以下风险：</p>
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              <li>修改字段类型可能影响数据库表结构</li>
              <li>类型修改后可能无法恢复到原始类型配置</li>
            </ul>
          </div>
        ),
        okText: '我了解风险，继续启用',
        cancelText: '取消',
        onOk() {
          console.log('用户确认启用'); // 调试日志
          setFieldInterfaceEditable(true);
          messageApi.success('字段接口编辑功能已启用');
        },
        onCancel() {
          console.log('用户取消启用'); // 调试日志
          messageApi.info('已取消启用字段接口编辑');
        },
      });
    } else {
      console.log('关闭编辑功能'); // 调试日志
      setFieldInterfaceEditable(false);
      messageApi.info('字段接口编辑功能已禁用');
    }
  };

  const columns: ColumnsType<DataType> = [
    {
      title: 'Field display name',
      dataIndex: 'fieldDisplayName',
      key: 'fieldDisplayName',
      width: 150,
    },
    {
      title: 'Field name',
      dataIndex: 'fieldName',
      key: 'fieldName',
      width: 120,
    },
    {
      title: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Field interface</span>
          <Switch
            size="small"
            checked={fieldInterfaceEditable}
            onChange={handleFieldInterfaceEditableChange}
            style={{ marginLeft: 8 }}
          />
        </div>
      ),
      dataIndex: 'fieldInterface',
      key: 'fieldInterface',
      width: 200,
      render: (value: string[], record: DataType) => (
        <Cascader
          options={getFilteredOptions(value)}
          value={value}
          onChange={(val) => selectFieldInterface(record.key, val as string[])}
          placeholder={fieldInterfaceEditable ? "请选择字段类型" : "编辑功能已禁用"}
          style={{ width: '100%' }}
          allowClear
          expandTrigger="hover"
          disabled={!fieldInterfaceEditable}
        />
      ),
    },
    {
      title: 'Title field',
      dataIndex: 'titleField',
      key: 'titleField',
      width: 100,
      render: (checked: boolean, record: DataType) => (
        <Switch
          checked={checked}
          onChange={(val) => toggleTitleField(record.key, val)}
          size="small"
        />
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 200,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record: DataType) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record.key)}
            style={{ padding: 0 }}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.key)}
            style={{ padding: 0 }}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '40px', background: '#f5f5f5', minHeight: '100vh' }}>
      {contextHolder}
      <div style={{ maxWidth: 1200, margin: '0 auto', background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '24px' }}>
          Field interface 级联选择器交互演示
        </Title>

        <Table
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          bordered
          size="middle"
        />

        <div style={{ marginTop: '24px', padding: '16px', background: '#f9f9f9', borderRadius: '6px' }}>
          <Title level={4}>使用说明：</Title>
          
          <div style={{ marginBottom: '16px' }}>
            <strong style={{ color: '#fa8c16' }}>📋 类型切换规则：</strong>
            
            <div style={{ marginTop: '12px' }}>
              <p style={{ margin: '8px 0', color: '#666', fontWeight: 500 }}>第一级类型切换矩阵：</p>
              <Table
                size="small"
                pagination={false}
                bordered
                dataSource={[
                  {
                    key: '1',
                    current: '整数',
                    toInteger: '✅',
                    toSingleText: '✅',
                    toMultiText: '✅',
                    note: '全部可选'
                  },
                  {
                    key: '2',
                    current: '单行文本',
                    toInteger: '❌',
                    toSingleText: '✅',
                    toMultiText: '✅',
                    note: '整数选项隐藏'
                  },
                  {
                    key: '3',
                    current: '多行文本',
                    toInteger: '❌',
                    toSingleText: '❌',
                    toMultiText: '✅',
                    note: '仅显示多行文本'
                  }
                ]}
                columns={[
                  {
                    title: '当前类型',
                    dataIndex: 'current',
                    key: 'current',
                    render: text => <span style={{ fontWeight: 500, color: '#1890ff' }}>{text}</span>
                  },
                  {
                    title: '→ 整数',
                    dataIndex: 'toInteger',
                    key: 'toInteger',
                    align: 'center',
                    render: text => <span style={{ fontSize: '16px' }}>{text}</span>
                  },
                  {
                    title: '→ 单行文本',
                    dataIndex: 'toSingleText',
                    key: 'toSingleText',
                    align: 'center',
                    render: text => <span style={{ fontSize: '16px' }}>{text}</span>
                  },
                  {
                    title: '→ 多行文本',
                    dataIndex: 'toMultiText',
                    key: 'toMultiText',
                    align: 'center',
                    render: text => <span style={{ fontSize: '16px' }}>{text}</span>
                  },
                  {
                    title: '说明',
                    dataIndex: 'note',
                    key: 'note',
                    render: text => <span style={{ color: '#666', fontSize: '12px' }}>{text}</span>
                  }
                ]}
                style={{ marginBottom: '16px' }}
              />
              
              <p style={{ margin: '8px 0', color: '#666', fontWeight: 500 }}>第二级类型切换矩阵：</p>
              <Table
                size="small"
                pagination={false}
                bordered
                dataSource={[
                  {
                    key: '1',
                    category: '单行文本',
                    current: 'varchar',
                    toVarchar: '✅',
                    toChar: '🚫',
                    toTinyInt: '❌',
                    toInteger: '❌',
                    toBigInt: '❌',
                    note: 'char禁用显示'
                  },
                  {
                    key: '2',
                    category: '单行文本',
                    current: 'char',
                    toVarchar: '✅',
                    toChar: '✅',
                    toTinyInt: '❌',
                    toInteger: '❌',
                    toBigInt: '❌',
                    note: '可自由切换'
                  },
                  {
                    key: '3',
                    category: '整数',
                    current: 'tinyInt',
                    toVarchar: '❌',
                    toChar: '❌',
                    toTinyInt: '✅',
                    toInteger: '✅',
                    toBigInt: '✅',
                    note: '可向大范围切换'
                  },
                  {
                    key: '4',
                    category: '整数',
                    current: 'integer',
                    toVarchar: '❌',
                    toChar: '❌',
                    toTinyInt: '🚫',
                    toInteger: '✅',
                    toBigInt: '✅',
                    note: 'tinyInt禁用显示'
                  },
                  {
                    key: '5',
                    category: '整数',
                    current: 'bigInt',
                    toVarchar: '❌',
                    toChar: '❌',
                    toTinyInt: '🚫',
                    toInteger: '🚫',
                    toBigInt: '✅',
                    note: '小范围类型禁用'
                  }
                ]}
                columns={[
                  {
                    title: '分类',
                    dataIndex: 'category',
                    key: 'category',
                    render: text => <span style={{ fontSize: '11px', color: '#999' }}>{text}</span>
                  },
                  {
                    title: '当前子类型',
                    dataIndex: 'current',
                    key: 'current',
                    render: text => <span style={{ fontWeight: 500, color: '#1890ff', fontSize: '12px' }}>{text}</span>
                  },
                  {
                    title: 'varchar',
                    dataIndex: 'toVarchar',
                    key: 'toVarchar',
                    align: 'center',
                    render: text => <span style={{ fontSize: '14px' }}>{text}</span>
                  },
                  {
                    title: 'char',
                    dataIndex: 'toChar',
                    key: 'toChar',
                    align: 'center',
                    render: text => <span style={{ fontSize: '14px' }}>{text}</span>
                  },
                  {
                    title: 'tinyInt',
                    dataIndex: 'toTinyInt',
                    key: 'toTinyInt',
                    align: 'center',
                    render: text => <span style={{ fontSize: '14px' }}>{text}</span>
                  },
                  {
                    title: 'integer',
                    dataIndex: 'toInteger',
                    key: 'toInteger',
                    align: 'center',
                    render: text => <span style={{ fontSize: '14px' }}>{text}</span>
                  },
                  {
                    title: 'bigInt',
                    dataIndex: 'toBigInt',
                    key: 'toBigInt',
                    align: 'center',
                    render: text => <span style={{ fontSize: '14px' }}>{text}</span>
                  },
                  {
                    title: '说明',
                    dataIndex: 'note',
                    key: 'note',
                    render: text => <span style={{ color: '#666', fontSize: '11px' }}>{text}</span>
                  }
                ]}
                style={{ marginBottom: '8px' }}
              />
              
              <div style={{ 
                display: 'flex', 
                gap: '16px', 
                fontSize: '12px', 
                color: '#666',
                background: '#f0f0f0',
                padding: '8px 12px',
                borderRadius: '4px',
                marginBottom: '8px'
              }}>
                <span><strong>✅</strong> 可切换</span>
                <span><strong>🚫</strong> 禁用显示（灰色）</span>
                <span><strong>❌</strong> 不可选（隐藏）</span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <strong style={{ color: '#1890ff' }}>🔧 字段接口编辑控制：</strong>
            <p style={{ margin: '4px 0 8px 0', color: '#666' }}>
              在 "Field interface" 列头右侧有一个编辑开关，默认为禁用状态。
            </p>
            <ul style={{ margin: '0 0 8px 20px', color: '#666' }}>
              <li>鼠标悬停开关可查看功能说明和安全警告</li>
              <li>点击开关启用时会弹出安全警告确认框</li>
              <li>确认后表格中所有字段接口的级联选择器将变为可编辑状态</li>
              <li>关闭开关会立即禁用所有字段接口编辑功能</li>
            </ul>
          </div>

          <div>
            <strong style={{ color: '#52c41a' }}>� 操作指南：</strong>
            <ol style={{ marginBottom: 0, color: '#666' }}>
              <li>点击 Field interface 列头的开关启用编辑功能</li>
              <li>手动点击各字段的级联选择器进行类型选择</li>
              <li>观察不同选择下的可用选项变化</li>
              <li>尝试切换 Title field 开关</li>
              <li>点击 Actions 列的 Edit 和 Delete 按钮查看反馈</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App
