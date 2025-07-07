import React, { useState } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Dropdown, 
  Drawer, 
  Transfer, 
  message, 
  Typography,
  Breadcrumb,
  Modal,
  Spin
} from 'antd';
import { PlusOutlined, DeleteOutlined, DownOutlined, HomeOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { ColumnsType, TableProps } from 'antd/es/table';
import type { TransferProps } from 'antd/es/transfer';
import type { MenuProps } from 'antd';

const { Title } = Typography;

// Table Transfer 组件
interface TableTransferProps extends TransferProps<TransferItemType> {
  dataSource: TransferItemType[];
  leftColumns: ColumnsType<TransferItemType>;
  rightColumns: ColumnsType<TransferItemType>;
}

const TableTransfer: React.FC<TableTransferProps> = ({ leftColumns, rightColumns, ...restProps }) => (
  <Transfer {...restProps}>
    {({
      direction,
      filteredItems,
      onItemSelectAll,
      onItemSelect,
      selectedKeys: listSelectedKeys,
      disabled: listDisabled,
    }) => {
      const columns = direction === 'left' ? leftColumns : rightColumns;

      const rowSelection: TableProps<TransferItemType>['rowSelection'] = {
        getCheckboxProps: (item) => ({ disabled: listDisabled || item.disabled }),
        onSelectAll(selected, _selectedRows, changeRows) {
          const diffKeys = changeRows.map(({ key }) => key);
          onItemSelectAll(diffKeys, selected);
        },
        onSelect({ key }, selected) {
          onItemSelect(key, selected);
        },
        selectedRowKeys: listSelectedKeys,
      };

      return (
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredItems}
          size="small"
          style={{ 
            pointerEvents: listDisabled ? 'none' : undefined,
          }}
          pagination={false} // 禁用Table分页，使用Transfer的分页
          scroll={{ 
            y: 350 // 增加表格高度，因为不需要为分页预留空间
          }}
          onRow={({ key, disabled: itemDisabled }) => ({
            onClick: () => {
              if (itemDisabled || listDisabled) return;
              onItemSelect(key, !listSelectedKeys.includes(key));
            },
          })}
        />
      );
    }}
  </Transfer>
);

interface CollectionType {
  key: string;
  collectionDisplayName: string;
  collectionName: string;
  collectionTemplate: string;
  collectionCategory: string;
  description: string;
  from: string;
}

interface TransferItemType {
  key: string;
  collectionDisplayName: string;
  collectionName: string;
  from: string;
  tag: string;
  description: string;
  enabled: boolean;
  disabled?: boolean;
}

const Collections: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [transferData, setTransferData] = useState<TransferItemType[]>([]);
  const [targetKeys, setTargetKeys] = useState<string[]>([]);
  const [loadingVisible, setLoadingVisible] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [pendingData, setPendingData] = useState<CollectionType[]>([]);

  // 数据表总量阈值设置
  const TABLE_LIMIT = 6; // 设置阈值为6张表（当前有4张表，便于测试）

  // 初始化表格数据
  const [dataSource, setDataSource] = useState<CollectionType[]>([
    {
      key: '1',
      collectionDisplayName: 'Users',
      collectionName: 'users',
      collectionTemplate: 'General collection',
      collectionCategory: 'User Management',
      description: '用户数据管理',
      from: 'System Table'
    },
    {
      key: '2',
      collectionDisplayName: 'Products',
      collectionName: 'products',
      collectionTemplate: 'General collection',
      collectionCategory: 'Product Management',
      description: '产品数据管理',
      from: 'System Table'
    },
    {
      key: '3',
      collectionDisplayName: 'Orders',
      collectionName: 'orders',
      collectionTemplate: 'General collection',
      collectionCategory: 'Order Management',
      description: '订单数据管理',
      from: 'User Created Table'
    },
    {
      key: '4',
      collectionDisplayName: 'Categories',
      collectionName: 'categories',
      collectionTemplate: 'General collection',
      collectionCategory: 'Category Management',
      description: '分类数据管理',
      from: 'System Table'
    }
  ]);

  // 初始化穿梭框数据（模拟未加入的表）
  const [availableCollections] = useState<TransferItemType[]>([
    {
      key: '5',
      collectionDisplayName: 'Customers',
      collectionName: 'customers',
      from: 'System Table',
      tag: 'CAT',
      description: 'Customer data management',
      enabled: true
    },
    {
      key: '6',
      collectionDisplayName: 'Inventory',
      collectionName: 'inventory',
      from: 'User Created Table',
      tag: 'DOG',
      description: 'Inventory management system',
      enabled: false
    },
    {
      key: '7',
      collectionDisplayName: 'Reviews',
      collectionName: 'reviews',
      from: 'User Created Table',
      tag: 'BIRD',
      description: 'Product reviews and ratings',
      enabled: true
    },
    {
      key: '8',
      collectionDisplayName: 'Payments',
      collectionName: 'payments',
      from: 'System Table',
      tag: 'CAT',
      description: 'Payment processing data',
      enabled: true
    },
    {
      key: '9',
      collectionDisplayName: 'Analytics',
      collectionName: 'analytics',
      from: 'System Table',
      tag: 'DOG',
      description: 'Business analytics and metrics',
      enabled: false
    },
    {
      key: '10',
      collectionDisplayName: 'Logs',
      collectionName: 'logs',
      from: 'System Table',
      tag: 'BIRD',
      description: 'System logs and monitoring',
      enabled: true
    },
    {
      key: '11',
      collectionDisplayName: 'Settings',
      collectionName: 'settings',
      from: 'User Created Table',
      tag: 'CAT',
      description: 'Application settings and configuration',
      enabled: false
    },
    {
      key: '12',
      collectionDisplayName: 'Notifications',
      collectionName: 'notifications',
      from: 'System Table',
      tag: 'DOG',
      description: 'Push notifications and alerts',
      enabled: true
    },
    {
      key: '13',
      collectionDisplayName: 'Audit Trail',
      collectionName: 'audit_trail',
      from: 'System Table',
      tag: 'SEC',
      description: 'Security and audit logging',
      enabled: true
    },
    {
      key: '14',
      collectionDisplayName: 'User Sessions',
      collectionName: 'user_sessions',
      from: 'System Table',
      tag: 'USER',
      description: 'User session management',
      enabled: false
    },
    {
      key: '15',
      collectionDisplayName: 'API Keys',
      collectionName: 'api_keys',
      from: 'System Table',
      tag: 'API',
      description: 'API key management',
      enabled: true
    },
    {
      key: '16',
      collectionDisplayName: 'Webhooks',
      collectionName: 'webhooks',
      from: 'User Created Table',
      tag: 'HOOK',
      description: 'Webhook configuration and logs',
      enabled: false
    },
    {
      key: '17',
      collectionDisplayName: 'Reports',
      collectionName: 'reports',
      from: 'User Created Table',
      tag: 'RPT',
      description: 'Custom reports and dashboards',
      enabled: true
    },
    {
      key: '18',
      collectionDisplayName: 'Templates',
      collectionName: 'templates',
      from: 'User Created Table',
      tag: 'TPL',
      description: 'Email and document templates',
      enabled: false
    },
    {
      key: '19',
      collectionDisplayName: 'Workflows',
      collectionName: 'workflows',
      from: 'User Created Table',
      tag: 'WF',
      description: 'Business workflow definitions',
      enabled: true
    },
    {
      key: '20',
      collectionDisplayName: 'Integrations',
      collectionName: 'integrations',
      from: 'System Table',
      tag: 'INT',
      description: 'Third-party integrations',
      enabled: false
    },
    {
      key: '21',
      collectionDisplayName: 'Backup Jobs',
      collectionName: 'backup_jobs',
      from: 'System Table',
      tag: 'BKP',
      description: 'Database backup job history',
      enabled: true
    },
    {
      key: '22',
      collectionDisplayName: 'Cache Stats',
      collectionName: 'cache_stats',
      from: 'System Table',
      tag: 'CACHE',
      description: 'Cache performance statistics',
      enabled: false
    },
    {
      key: '23',
      collectionDisplayName: 'File Uploads',
      collectionName: 'file_uploads',
      from: 'User Created Table',
      tag: 'FILE',
      description: 'File upload metadata',
      enabled: true
    },
    {
      key: '24',
      collectionDisplayName: 'Email Queue',
      collectionName: 'email_queue',
      from: 'System Table',
      tag: 'EMAIL',
      description: 'Email delivery queue',
      enabled: false
    },
    {
      key: '25',
      collectionDisplayName: 'Scheduled Tasks',
      collectionName: 'scheduled_tasks',
      from: 'System Table',
      tag: 'SCHED',
      description: 'Scheduled task definitions',
      enabled: true
    },
    {
      key: '26',
      collectionDisplayName: 'Feature Flags',
      collectionName: 'feature_flags',
      from: 'User Created Table',
      tag: 'FLAG',
      description: 'Feature toggle configuration',
      enabled: false
    },
    {
      key: '27',
      collectionDisplayName: 'Metrics',
      collectionName: 'metrics',
      from: 'System Table',
      tag: 'METRIC',
      description: 'Application performance metrics',
      enabled: true
    },
    {
      key: '28',
      collectionDisplayName: 'Alerts',
      collectionName: 'alerts',
      from: 'System Table',
      tag: 'ALERT',
      description: 'System alert configuration',
      enabled: false
    },
    {
      key: '29',
      collectionDisplayName: 'Subscriptions',
      collectionName: 'subscriptions',
      from: 'User Created Table',
      tag: 'SUB',
      description: 'User subscription management',
      enabled: true
    },
    {
      key: '30',
      collectionDisplayName: 'Feedback',
      collectionName: 'feedback',
      from: 'User Created Table',
      tag: 'FB',
      description: 'User feedback and surveys',
      enabled: false
    }
  ]);

  // 处理表格行选择
  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection: TableProps<CollectionType>['rowSelection'] = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  // 处理删除选中项
  const handleDelete = () => {
    if (selectedRowKeys.length === 0) {
      messageApi.warning('请选择要删除的项');
      return;
    }
    setDataSource(prev => prev.filter(item => !selectedRowKeys.includes(item.key)));
    setSelectedRowKeys([]);
    messageApi.success(`已删除 ${selectedRowKeys.length} 个集合`);
  };

  // 处理刷新按钮点击
  const handleRefresh = () => {
    if (!syncInProgress && pendingData.length > 0) {
      // 第一次点击：开始同步（当有待同步数据时）
      setSyncInProgress(true);
      messageApi.warning('Main data source sychronization in progress');
    } else if (syncInProgress && pendingData.length > 0) {
      // 第二次点击：完成同步
      setSyncInProgress(false);
      messageApi.success('Main data source sychronization successful');
      
      // 将待同步的数据加载到列表中
      setDataSource(prev => [...prev, ...pendingData]);
      setPendingData([]);
    } else {
      // 没有待同步数据时的普通刷新
      messageApi.info('没有待同步的数据');
    }
  };

  // 处理 Load collections 按钮点击
  const handleLoadCollections = () => {
    // 获取当前已在表格中的数据键值
    const currentKeys = dataSource.map(item => item.key);
    
    // 只显示未加入到列表的数据
    const filteredAvailableCollections = availableCollections.filter(item => 
      !currentKeys.includes(item.key)
    );
    
    // 穿梭框数据源只包含未加入的数据
    setTransferData(filteredAvailableCollections.map(item => ({
      ...item,
      disabled: false
    })));
    
    // 右侧初始为空（不显示已加入的数据）
    setTargetKeys([]);
    setDrawerVisible(true);
  };

  // 处理穿梭框变化
  const handleTransferChange: TransferProps['onChange'] = (newTargetKeys) => {
    setTargetKeys(newTargetKeys as string[]);
    messageApi.info(`移动了 ${newTargetKeys.length} 个项目`);
  };

  // 定义穿梭框表格列
  const transferColumns: ColumnsType<TransferItemType> = [
    {
      dataIndex: 'collectionDisplayName',
      title: 'Collection Display Name',
      width: '40%',
    },
    {
      dataIndex: 'collectionName',
      title: 'Collection Name',
      width: '30%',
    },
    {
      dataIndex: 'from',
      title: 'From',
      width: '30%',
    },
  ];

  // 处理穿梭框搜索
  const handleSearch: TransferProps['onSearch'] = (dir, value) => {
    console.log('搜索方向:', dir, '搜索值:', value);
  };

  // 提交穿梭框选择
  const handleSubmit = () => {
    // 获取新添加的集合（只处理选中的新集合）
    const newCollections = transferData
      .filter(item => targetKeys.includes(item.key))
      .map(item => ({
        key: item.key,
        collectionDisplayName: item.collectionDisplayName,
        collectionName: item.collectionName,
        collectionTemplate: 'General collection',
        collectionCategory: 'Imported',
        description: `从 ${item.from} 导入`,
        from: item.from
      }));

    if (newCollections.length === 0) {
      messageApi.warning('请至少选择一个集合进行导入');
      return;
    }

    // 计算导入后的总数量
    const totalAfterImport = dataSource.length + newCollections.length;

    // 策略1：超过阈值的情况
    if (totalAfterImport > TABLE_LIMIT) {
      Modal.confirm({
        title: '数据表数量警告',
        content: `当前系统数据表总量已超过 ${TABLE_LIMIT} 张，为避免等待时间过长，请在列表手动点击刷新按钮异步加载。`,
        okText: '确定提交',
        cancelText: '取消',
        onOk: () => {
          // 将数据存储到待同步状态，不直接添加到表格
          setPendingData(prev => [...prev, ...newCollections]);
          setDrawerVisible(false);
          messageApi.success(`成功提交 ${newCollections.length} 个集合，请点击刷新按钮完成同步`);
        },
      });
    } else {
      // 策略2：未超过阈值的情况
      Modal.confirm({
        title: '确认导入',
        content: `即将导入 ${newCollections.length} 个集合，系统需要重新加载，预计需要等待 2～5s。`,
        okText: '确认',
        cancelText: '取消',
        onOk: () => {
          setLoadingVisible(true);
          setLoadingText('系统正在重新加载，请稍候...');
          
          // 3秒后完成loading
          setTimeout(() => {
            setDataSource(prev => [...prev, ...newCollections]);
            setLoadingVisible(false);
            setDrawerVisible(false);
            messageApi.success(`成功导入 ${newCollections.length} 个集合`);
          }, 3000);
        },
      });
    }
  };

  // 表格列定义
  const columns: ColumnsType<CollectionType> = [
    {
      title: 'Collection display name',
      dataIndex: 'collectionDisplayName',
      key: 'collectionDisplayName',
      width: 200,
      sorter: (a, b) => a.collectionDisplayName.localeCompare(b.collectionDisplayName),
    },
    {
      title: 'Collection name',
      dataIndex: 'collectionName',
      key: 'collectionName',
      width: 150,
      sorter: (a, b) => a.collectionName.localeCompare(b.collectionName),
    },
    {
      title: 'Collection template',
      dataIndex: 'collectionTemplate',
      key: 'collectionTemplate',
      width: 180,
    },
    {
      title: 'Collection category',
      dataIndex: 'collectionCategory',
      key: 'collectionCategory',
      width: 180,
    },
    {
      title: 'From',
      dataIndex: 'from',
      key: 'from',
      width: 150,
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
      width: 250,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            onClick={() => messageApi.info(`配置字段: ${record.collectionDisplayName}`)}
            style={{ padding: '0 4px' }}
          >
            Configure fields
          </Button>
          <Button
            type="link"
            onClick={() => messageApi.info(`编辑: ${record.collectionDisplayName}`)}
            style={{ padding: '0 4px' }}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            onClick={() => {
              setDataSource(prev => prev.filter(item => item.key !== record.key));
              messageApi.warning(`删除: ${record.collectionDisplayName}`);
            }}
            style={{ padding: '0 4px' }}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  // Create collection 下拉菜单
  const createCollectionMenuItems: MenuProps['items'] = [
    {
      key: 'general',
      label: 'General Collection',
      onClick: () => messageApi.info('创建通用集合'),
    },
    {
      key: 'custom',
      label: 'Custom Collection',
      onClick: () => messageApi.info('创建自定义集合'),
    },
    {
      key: 'template',
      label: 'From Template',
      onClick: () => messageApi.info('从模板创建'),
    },
  ];

  return (
    <div style={{ 
      padding: '24px', 
      width: '100%', 
      minHeight: '100vh',
      backgroundColor: '#ffffff'
    }}>
      {contextHolder}
      
      {/* 面包屑导航 */}
      <Breadcrumb style={{ marginBottom: '16px' }}>
        <Breadcrumb.Item>
          <Link to="/">
            <HomeOutlined />
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/">首页</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>Collections</Breadcrumb.Item>
      </Breadcrumb>

      <div style={{ marginBottom: '16px' }}>
        <Title level={2}>Collections</Title>
      </div>

      {/* 操作按钮区域 */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Button
            icon={<FilterOutlined />}
          >
            Filter
          </Button>
        </Space>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
          <Button
            type="default"
            onClick={handleLoadCollections}
          >
            Load collections
          </Button>
          <Button
            danger
            disabled={selectedRowKeys.length === 0}
            onClick={handleDelete}
            icon={<DeleteOutlined />}
          >
            Delete ({selectedRowKeys.length})
          </Button>
          <Dropdown
            menu={{ items: createCollectionMenuItems }}
            placement="bottomRight"
          >
            <Button type="primary" icon={<PlusOutlined />}>
              Create collection <DownOutlined />
            </Button>
          </Dropdown>
        </Space>
      </div>

      {/* 表格 */}
      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={dataSource}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} items`,
        }}
        scroll={{ x: 'max-content' }}
        bordered
      />

      {/* 加载集合抽屉 */}
      <Drawer
        title="Load Collections"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width="80%"
        footer={
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setDrawerVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" onClick={handleSubmit}>
                Submit
              </Button>
            </Space>
          </div>
        }
      >
        <div style={{ marginBottom: '16px' }}>
          <p>选择要加载的集合。左侧为可用的未加入集合，右侧为即将加入的集合。</p>
        </div>
        
        <TableTransfer
          dataSource={transferData}
          targetKeys={targetKeys}
          onChange={handleTransferChange}
          onSearch={handleSearch}
          filterOption={(inputValue, option) => {
            // 只根据 collection name 或 collection display name 搜索
            const searchValue = inputValue.toLowerCase();
            const displayName = option.collectionDisplayName ? option.collectionDisplayName.toLowerCase() : '';
            const name = option.collectionName ? option.collectionName.toLowerCase() : '';
            
            return displayName.includes(searchValue) || 
                   name.includes(searchValue);
          }}
          titles={[
            `Available Collections (${transferData.filter(item => !targetKeys.includes(item.key)).length} 项)`,
            `Collections to Load (${targetKeys.length} 项)`
          ]}
          leftColumns={transferColumns}
          rightColumns={transferColumns}
          showSearch
          style={{ 
            marginBottom: '16px',
          }}
          listStyle={{
            width: '48%',
            height: '450px',
            border: '1px solid #e8e8e8',
            borderRadius: '4px',
            position: 'relative',
            paddingBottom: '50px' // 为分页器预留底部空间
          }}
        />
      </Drawer>

      {/* Loading 模态框 */}
      <Modal
        open={loadingVisible}
        closable={false}
        footer={null}
        centered
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
            {loadingText}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Collections;
