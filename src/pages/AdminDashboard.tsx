import React, { useMemo, useState } from 'react';
import {
  Layout,
  Menu,
  Typography,
  Card,
  Table,
  Button,
  Drawer,
  Form,
  Input,
  Collapse,
  Space,
  message,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DatabaseOutlined,
  FolderOpenOutlined,
  KeyOutlined,
  FileOutlined,
  SafetyOutlined,
  BellOutlined,
  NodeExpandOutlined,
  SecurityScanOutlined,
  SettingOutlined,
  BgColorsOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';

const { Sider, Content } = Layout;
const { Title } = Typography;

interface CollectionItem {
  key: string;
  displayName: string;
  name: string;
  from: 'System Table' | 'User Created Table';
  description?: string;
}

const AdminDashboard: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState('data-sources');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CollectionItem | null>(null);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const data: CollectionItem[] = useMemo(
    () => [
      {
        key: '1',
        displayName: '用户管理',
        name: 'users',
        from: 'System Table',
        description: '系统用户数据',
      },
    ],
    []
  );

  const columns: ColumnsType<CollectionItem> = [
    { title: 'Collection display name', dataIndex: 'displayName', key: 'displayName', width: 220 },
    { title: 'Collection name', dataIndex: 'name', key: 'name', width: 180 },
    { title: 'From', dataIndex: 'from', key: 'from', width: 160, render: (v) => <Tag color={v === 'System Table' ? 'blue' : 'green'}>{v}</Tag> },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            onClick={() => {
              setEditingRecord(record);
              form.setFieldsValue({
                displayName: record.displayName,
                name: record.name,
                description: record.description,
              });
              setDrawerOpen(true);
            }}
          >
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  const menuItems = [
    { key: 'data-sources', icon: <DatabaseOutlined />, label: 'Data sources' },
    { key: 'variables', icon: <KeyOutlined />, label: 'Variables and secrets' },
    { key: 'file-manager', icon: <FolderOpenOutlined />, label: 'File manager' },
    { key: 'license', icon: <SafetyOutlined />, label: 'License settings' },
    { key: 'logger', icon: <FileSearchOutlined />, label: 'Logger' },
    { key: 'mobile', icon: <NodeExpandOutlined />, label: 'Mobile' },
    { key: 'notification', icon: <BellOutlined />, label: 'Notification manager' },
    { key: 'routes', icon: <FileOutlined />, label: 'Routes' },
    { key: 'security', icon: <SecurityScanOutlined />, label: 'Security' },
    { key: 'system', icon: <SettingOutlined />, label: 'System settings' },
    { key: 'theme', icon: <BgColorsOutlined />, label: 'Theme editor' },
  ];

  const renderMain = () => {
    if (selectedKey !== 'data-sources') {
      return (
        <Card>
          <Title level={4} style={{ marginBottom: 8 }}>
            {menuItems.find((m) => m.key === selectedKey)?.label}
          </Title>
          <div style={{ color: '#999' }}>该模块为占位页面，后续可按需补充功能。</div>
        </Card>
      );
    }

    return (
      <>
        <Card
          title={<span style={{ fontWeight: 600 }}>Collections</span>}
        >
          <Table
            rowKey="key"
            columns={columns}
            dataSource={data}
            pagination={false}
            bordered
          />
        </Card>

        <Drawer
          title={`Edit collection${editingRecord ? ` - ${editingRecord.displayName}` : ''}`}
          width={720}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          extra={
            <Space>
              <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
              <Button type="primary" onClick={() => form.submit()}>Submit</Button>
            </Space>
          }
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => {
              // 简单模拟保存
              messageApi.success('已保存更改');
              setEditingRecord((prev) => (prev ? { ...prev, ...values } as CollectionItem : prev));
              setDrawerOpen(false);
            }}
          >
            <Form.Item
              label="Collection display name"
              name="displayName"
              rules={[{ required: true, message: '请输入显示名称' }]}
            >
              <Input placeholder="用户管理" />
            </Form.Item>
            <Form.Item
              label="Collection name"
              name="name"
              rules={[{ required: true, message: '请输入集合标识' }]}
              tooltip="支持字母、数字与下划线，必须以字母开头"
            >
              <Input placeholder="users" />
            </Form.Item>
            <Form.Item label="Description" name="description">
              <Input.TextArea rows={3} placeholder="可选描述" />
            </Form.Item>

            <Collapse
              bordered={false}
              items={[
                { key: 'list', label: 'List (required)', children: <div>列表查询参数设置（占位）</div> },
                { key: 'get', label: 'Get (required)', children: <div>详情查询参数设置（占位）</div> },
                { key: 'create', label: 'Create', children: <div>创建参数设置（占位）</div> },
                { key: 'update', label: 'Update', children: <div>更新参数设置（占位）</div> },
                { key: 'destroy', label: 'Destroy', children: <div>删除参数设置（占位）</div> },
              ]}
              style={{ marginBottom: 16 }}
            />

            <Title level={5} style={{ marginTop: 8 }}>Fields</Title>
            <Table
              size="small"
              bordered
              pagination={false}
              columns={[
                { title: 'Field display name', dataIndex: 'label', key: 'label', width: 200 },
                { title: 'Field name', dataIndex: 'name', key: 'name', width: 160 },
                { title: 'Field type', dataIndex: 'type', key: 'type', width: 120 },
                { title: 'Field interface', dataIndex: 'ui', key: 'ui', width: 180 },
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 120,
                  render: () => <Button type="link" danger>Delete</Button>,
                },
              ]}
              dataSource={[
                { key: 'f1', label: 'email', name: 'email', type: 'string', ui: 'Single line text' },
                { key: 'f2', label: 'name', name: 'name', type: 'string', ui: 'Single line text' },
              ]}
            />
          </Form>
        </Drawer>
      </>
    );
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {contextHolder}
      <Sider width={240} theme="light">
        <div style={{ padding: '16px', fontWeight: 600 }}>管理控制台</div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={(e) => setSelectedKey(e.key)}
          style={{ height: '100%', borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Content style={{ padding: 24 }}>
          <Title level={3} style={{ marginBottom: 16 }}>Data source manager</Title>
          {renderMain()}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminDashboard;
