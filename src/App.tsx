import { useState } from 'react';
import { Table, Cascader, Switch, Button, Space, message, Typography, Modal, Dropdown, Drawer, Form, Input, Select } from 'antd';
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined, PlusOutlined, DownOutlined } from '@ant-design/icons';
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
  {
    value: 'email',
    label: '邮箱',
    children: [
      { value: 'email', label: 'email' },
      {
        value: 'string',
        label: 'string',
        children: [
          { value: 'varchar', label: 'varchar' },
          { value: 'char', label: 'char' },
        ],
      },
    ],
  },
];

function App() {
  const [messageApi, contextHolder] = message.useMessage();
  const [fieldInterfaceEditable, setFieldInterfaceEditable] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedFieldType, setSelectedFieldType] = useState<string>('');
  const [form] = Form.useForm();

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
    {
      key: '5',
      fieldDisplayName: 'Email',
      fieldName: 'email',
      fieldInterface: ['email', 'email'],
      titleField: false,
      description: '用户邮箱地址',
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

    // 如果是邮箱类型
    if (firstLevel === 'email') {
      const [, , thirdLevel] = currentValue;

      if (secondLevel === 'email') {
        // email 可以切换到 string 类型，也可以切换到单行文本和多行文本
        return [
          {
            value: 'email',
            label: '邮箱',
            children: [
              { value: 'email', label: 'email' }, // 保留当前选择
              {
                value: 'string',
                label: 'string',
                children: [
                  { value: 'varchar', label: 'varchar' },
                  { value: 'char', label: 'char' },
                ],
              },
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
      } else if (secondLevel === 'string') {
        if (thirdLevel === 'varchar') {
          // string->varchar 不能切换到 char，但可以切换到其他类型
          return [
            {
              value: 'email',
              label: '邮箱',
              children: [
                { value: 'email', label: 'email' },
                {
                  value: 'string',
                  label: 'string',
                  children: [
                    { value: 'varchar', label: 'varchar' }, // 保留当前选择
                    { value: 'char', label: 'char', disabled: true }, // 禁用 char
                  ],
                },
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
        } else if (thirdLevel === 'char') {
          // string->char 可以切换到 varchar
          return [
            {
              value: 'email',
              label: '邮箱',
              children: [
                { value: 'email', label: 'email' },
                {
                  value: 'string',
                  label: 'string',
                  children: [
                    { value: 'varchar', label: 'varchar' },
                    { value: 'char', label: 'char' }, // 保留当前选择
                  ],
                },
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

  // 获取新字段的级联选择器选项
  const getNewFieldCascaderOptions = (fieldType: string) => {
    switch (fieldType) {
      case 'singleText':
        return [
          {
            value: 'singleText',
            label: '单行文本',
            children: [
              { value: 'varchar', label: 'varchar' },
              { value: 'char', label: 'char' },
            ],
          },
        ];
      case 'multiText':
        return [
          {
            value: 'multiText',
            label: '多行文本',
          },
        ];
      case 'integer':
        return [
          {
            value: 'integer',
            label: '整数',
            children: [
              { value: 'tinyInt', label: 'tinyInt' },
              { value: 'integer', label: 'integer' },
              { value: 'bigInt', label: 'bigInt' },
            ],
          },
        ];
      default:
        return [];
    }
  };

  // 获取第二级数据类型选项（用于Add Field表单）
  const getDataTypeOptions = (fieldType: string) => {
    switch (fieldType) {
      case 'singleText':
        return [
          { value: 'varchar', label: 'varchar' },
          { value: 'char', label: 'char' },
        ];
      case 'integer':
        return [
          { value: 'tinyInt', label: 'tinyInt' },
          { value: 'integer', label: 'integer' },
          { value: 'bigInt', label: 'bigInt' },
        ];
      case 'email':
        return [
          { value: 'email', label: 'email' },
          {
            value: 'string',
            label: 'string',
            children: [
              { value: 'varchar', label: 'varchar' },
              { value: 'char', label: 'char' },
            ]
          },
        ];
      default:
        return [];
    }
  };

  // 获取新字段的默认值
  const getDefaultFieldInterface = (fieldType: string) => {
    switch (fieldType) {
      case 'singleText':
        return ['singleText', 'varchar'];
      case 'multiText':
        return ['multiText'];
      case 'integer':
        return ['integer', 'tinyInt'];
      case 'email':
        return ['email', 'email'];
      default:
        return [];
    }
  };

  // 获取默认的第二级数据类型
  const getDefaultDataType = (fieldType: string) => {
    switch (fieldType) {
      case 'singleText':
        return 'varchar';
      case 'integer':
        return 'tinyInt';
      case 'email':
        return 'email';
      default:
        return '';
    }
  };

  // 判断字段类型是否有子类型
  const hasDataType = (fieldType: string) => {
    // 直接判断哪些类型需要显示额外的选择字段
    return fieldType === 'singleText' || fieldType === 'integer' || fieldType === 'email';
  };

  // 获取级联层级描述
  const getCascaderLevelLabels = (fieldInterface: string[]) => {
    if (!fieldInterface || fieldInterface.length === 0) return [];

    const [firstLevel, secondLevel, thirdLevel] = fieldInterface;
    const labels = ['Field interface'];

    if (firstLevel === 'email') {
      // 邮箱类型：第一级是Field interface，第二级是Field type，第三级是Data type
      if (secondLevel) {
        labels.push('Field type');
        if (thirdLevel && secondLevel === 'string') {
          labels.push('Data type');
        }
      }
    } else if (['singleText', 'integer'].includes(firstLevel)) {
      // 单行文本和整数：第一级是Field interface，第二级直接是Data type
      if (secondLevel) {
        labels.push('Data type');
      }
    }

    return labels;
  };

  // 自定义级联显示
  const displayRender = (labels: string[], selectedOptions: any[]) => {
    const levelLabels = getCascaderLevelLabels(selectedOptions?.map(opt => opt.value) || []);
    return labels.map((label, index) => {
      const levelDesc = levelLabels[index] || '';
      return (
        <span key={index}>
          {index > 0 && <span style={{ margin: '0 4px', color: '#999' }}>→</span>}
          <span style={{ fontSize: '11px', color: '#999', marginRight: '2px' }}>
            {levelDesc && `${levelDesc}: `}
          </span>
          <span>{label}</span>
        </span>
      );
    });
  };

  // 处理添加字段类型选择
  const handleAddFieldTypeSelect = (fieldType: string) => {
    setSelectedFieldType(fieldType);
    setDrawerVisible(true);
    // 设置表单默认值
    const defaultValues: any = {};

    if (hasDataType(fieldType)) {
      if (fieldType === 'email') {
        // 邮箱类型设置级联默认值
        defaultValues.dataType = ['email']; // 默认选择 email
      } else {
        // 其他类型设置第二级数据类型的默认值
        defaultValues.dataType = getDefaultDataType(fieldType);
      }
    }

    form.setFieldsValue(defaultValues);
  };

  // 处理表单提交
  const handleFormSubmit = () => {
    form.validateFields().then(values => {
      const newKey = (dataSource.length + 1).toString();

      // 根据是否有子类型构建 fieldInterface
      let fieldInterface;
      if (hasDataType(selectedFieldType)) {
        if (selectedFieldType === 'email') {
          // 邮箱类型特殊处理
          if (Array.isArray(values.dataType)) {
            // 如果选择了 string->varchar/char，使用完整路径
            fieldInterface = [selectedFieldType, ...values.dataType];
          } else {
            // 如果只选择了 email，使用两级结构
            fieldInterface = [selectedFieldType, values.dataType];
          }
        } else {
          // 其他类型使用第一级类型 + 用户选择的第二级类型
          fieldInterface = [selectedFieldType, values.dataType];
        }
      } else {
        // 没有子类型时，直接使用默认的 fieldInterface
        fieldInterface = getDefaultFieldInterface(selectedFieldType);
      }

      const newField: DataType = {
        key: newKey,
        fieldDisplayName: values.fieldDisplayName,
        fieldName: values.fieldName,
        fieldInterface: fieldInterface,
        titleField: false,
        description: '',
      };

      setDataSource(prev => [...prev, newField]);
      messageApi.success(`成功添加字段: ${values.fieldDisplayName}`);
      setDrawerVisible(false);
      form.resetFields();
      setSelectedFieldType('');
    });
  };

  // 处理抽屉关闭
  const handleDrawerClose = () => {
    setDrawerVisible(false);
    form.resetFields();
    setSelectedFieldType('');
  };

  // Add Field 下拉菜单项
  const addFieldMenuItems = [
    {
      key: 'singleText',
      label: '单行文本',
      onClick: () => handleAddFieldTypeSelect('singleText'),
    },
    {
      key: 'multiText',
      label: '多行文本',
      onClick: () => handleAddFieldTypeSelect('multiText'),
    },
    {
      key: 'integer',
      label: '整数',
      onClick: () => handleAddFieldTypeSelect('integer'),
    },
    {
      key: 'email',
      label: '邮箱',
      onClick: () => handleAddFieldTypeSelect('email'),
    },
  ];

  const handleFieldInterfaceEditableChange = (checked: boolean) => {
    console.log('开关状态变更:', checked, '当前状态:', fieldInterfaceEditable); // 调试日志
    if (checked) {
      Modal.confirm({
        title: '警告',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>修改字段类型可能会导致以下风险：</p>
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              <li>可能同步修改数据库表结构</li>
              <li>可能无法恢复到原始类型配置</li>
            </ul>
          </div>
        ),
        okText: '确定',
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
      <div style={{ margin: '0 auto', background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '24px' }}>
          Field interface 级联选择器交互演示
        </Title>

        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <Dropdown
            menu={{ items: addFieldMenuItems }}
            placement="bottomLeft"
            trigger={['hover']}
          >
            <Button type="primary" icon={<PlusOutlined />}>
              Add Field <DownOutlined />
            </Button>
          </Dropdown>
        </div>

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
            <strong style={{ color: '#722ed1' }}>🏗️ 级联结构说明：</strong>
            <div style={{
              marginTop: '8px',
              padding: '12px',
              background: '#f0f2ff',
              borderRadius: '4px',
              border: '1px solid #d6e4ff'
            }}>
              <p style={{ margin: '0 0 8px 0', color: '#666', lineHeight: '1.6' }}>
                Field interface 级联选择器包含三个层级：
              </p>
              <ul style={{ margin: '0 0 8px 20px', color: '#666', lineHeight: '1.6' }}>
                <li><strong>第一级：Field interface</strong> - 字段接口类型（如：整数、单行文本、多行文本、邮箱）</li>
                <li><strong>第二级：Field type</strong> - 字段类型（如：email、string）</li>
                <li><strong>第三级：Data type</strong> - 数据类型（如：varchar、char、tinyInt、integer、bigInt）</li>
              </ul>
              <p style={{ margin: '0', color: '#666', lineHeight: '1.6' }}>
                <strong>简化规则：</strong>当某一级只有唯一选项时，该级别将被省略不显示。
                例如：多行文本只有一个选项，因此不显示后续级别；
                单行文本的 varchar/char 直接作为第二级显示，省略中间的 Field type 层级。
              </p>
            </div>
          </div>

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
                    toEmail: '✅',
                    note: '全部可选'
                  },
                  {
                    key: '2',
                    current: '单行文本',
                    toInteger: '❌',
                    toSingleText: '✅',
                    toMultiText: '✅',
                    toEmail: '✅',
                    note: '整数选项隐藏'
                  },
                  {
                    key: '3',
                    current: '多行文本',
                    toInteger: '❌',
                    toSingleText: '❌',
                    toMultiText: '✅',
                    toEmail: '❌',
                    note: '仅显示多行文本'
                  },
                  {
                    key: '4',
                    current: '邮箱',
                    toInteger: '❌',
                    toSingleText: '✅',
                    toMultiText: '✅',
                    toEmail: '✅',
                    note: '整数选项隐藏'
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
                    title: '→ 邮箱',
                    dataIndex: 'toEmail',
                    key: 'toEmail',
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
                  },
                  {
                    key: '6',
                    category: '邮箱',
                    current: 'email',
                    toVarchar: '❌',
                    toChar: '❌',
                    toTinyInt: '❌',
                    toInteger: '❌',
                    toBigInt: '❌',
                    note: '可切换到string类型'
                  },
                  {
                    key: '7',
                    category: '邮箱',
                    current: 'string',
                    toVarchar: '❌',
                    toChar: '❌',
                    toTinyInt: '❌',
                    toInteger: '❌',
                    toBigInt: '❌',
                    note: '第三级：varchar/char'
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
            <strong style={{ color: '#52c41a' }}>⚡ 操作指南：</strong>
            <ol style={{ marginBottom: 0, color: '#666' }}>
              <li>点击表格上方的 "Add Field" 按钮，悬浮显示字段类型选项</li>
              <li>选择字段类型后，从右侧抽屉中填写字段信息</li>
              <li>点击 Field interface 列头的开关启用编辑功能</li>
              <li>手动点击各字段的级联选择器进行类型选择</li>
              <li>观察不同选择下的可用选项变化</li>
              <li>尝试切换 Title field 开关</li>
              <li>点击 Actions 列的 Edit 和 Delete 按钮查看反馈</li>
            </ol>
          </div>
        </div>

        {/* 添加字段抽屉 */}
        <Drawer
          title={`添加字段 - ${selectedFieldType === 'singleText' ? '单行文本' : selectedFieldType === 'multiText' ? '多行文本' : '整数'}`}
          width={400}
          placement="right"
          onClose={handleDrawerClose}
          open={drawerVisible}
          footer={
            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={handleDrawerClose}>取消</Button>
                <Button type="primary" onClick={handleFormSubmit}>
                  提交
                </Button>
              </Space>
            </div>
          }
        >
          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
          >
            <Form.Item
              label="Field display name"
              name="fieldDisplayName"
              rules={[{ required: true, message: '请输入字段显示名称' }]}
            >
              <Input placeholder="请输入字段显示名称" />
            </Form.Item>

            <Form.Item
              label="Field name"
              name="fieldName"
              rules={[{ required: true, message: '请输入字段名称' }]}
            >
              <Input placeholder="请输入字段名称" />
            </Form.Item>

            {hasDataType(selectedFieldType) && (
              <Form.Item
                label={selectedFieldType === 'email' ? 'Field type' : 'Data type'}
                name="dataType"
                rules={[{ required: true, message: selectedFieldType === 'email' ? '请选择字段类型' : '请选择数据类型' }]}
              >
                {selectedFieldType === 'email' ? (
                  <Cascader
                    options={getDataTypeOptions(selectedFieldType)}
                    placeholder="请选择字段类型"
                    expandTrigger="hover"
                    showSearch={{ filter: (inputValue, path) => path.some(option => option.label?.toLowerCase().indexOf(inputValue.toLowerCase()) > -1) }}
                  />
                ) : (
                  <Select
                    options={getDataTypeOptions(selectedFieldType)}
                    placeholder="请选择数据类型"
                    showSearch
                  />
                )}
              </Form.Item>
            )}
          </Form>
        </Drawer>
      </div>
    </div>
  );
}

export default App
