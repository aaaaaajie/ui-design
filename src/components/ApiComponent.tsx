import React, { useState, useMemo } from 'react';
import { Button, Dropdown, Layout, Row, Col, Card, Modal, Form, Input, Table, message } from 'antd';
import { PlusOutlined, DownOutlined, SaveOutlined, SettingOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import ApiRequestPanel from './ApiRequestPanel';
import ApiResponsePanel from './ApiResponsePanel';
// 新增：类型导入，便于在 Block 中声明 initialConfig 类型
import type { RequestPanelConfig } from './ApiRequestPanel';
import { ReloadOutlined } from '@ant-design/icons';

const { Content } = Layout;

interface ResponseData {
    status?: number;
    statusText?: string;
    headers?: Record<string, any>;
    data?: any;
    paginationMapping?: any; // 分页映射配置
    config?: any;
    timestamp?: string;
    error?: boolean;
}

interface Block {
    id: string;
    type: 'api-request';
    title: string;
    response?: ResponseData | null;
    displayComponent?: React.ReactNode;
    requestPanelRef?: React.RefObject<any>;
    // 将 total 设为必填，保证传给 ApiRequestPanel 的类型一致
    currentPagination?: { current: number; pageSize: number; total: number; totalPages?: number };
    // 新增：是否仅展示 UI（不显示请求/响应配置）
    displayOnly?: boolean;
    // 新增：从数据源/模板注入的初始配置
    initialConfig?: Partial<RequestPanelConfig>;
}

// 新增：数据源与模版类型
interface DataSourceTemplate {
    id: string;
    name: string; // 数据源名称
    createdAt: string;
    // 请求面板配置快照，用作模板
    config: any;
    // 用于预览展示的字段（从最近一次 response 推断）
    fields: Array<{ key: string; name: string; type: string }>;
}

const App: React.FC = () => {
    const [blocks, setBlocks] = useState<Block[]>([]);
    // 新增：模板/数据源列表
    const [dataSources, setDataSources] = useState<DataSourceTemplate[]>([]);

    // 新增：创建数据源二次弹窗
    const [saveDsVisible, setSaveDsVisible] = useState(false);
    const [dsForm] = Form.useForm();

    // 新增：创建弹窗与草稿 block
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [draftBlock, setDraftBlock] = useState<Block | null>(null);

    // 新增：编辑配置弹窗状态（两栏编辑草稿）
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingBlock, setEditingBlock] = useState<Block | null>(null);
    const [editInitialConfig, setEditInitialConfig] = useState<Partial<RequestPanelConfig> | undefined>(undefined);
    const [editDraftBlock, setEditDraftBlock] = useState<Block | null>(null);

    // 基于数据源渲染下拉菜单项
    const dataSourceMenuItems = useMemo<MenuProps['items']>(() => {
        const items: MenuProps['items'] = dataSources.map(ds => ({
            key: `ds-${ds.id}`,
            label: ds.name,
            onClick: () => handleCreateFromDataSource(ds),
        }));
        return [
            { type: 'group', key: 'group-templates', label: 'Saved Data Sources', children: items as any },
            { type: 'divider' as const },
            { key: 'blank-block', label: 'Blank Block', onClick: () => handleOpenCreateModal('api-request', 'API Request') },
        ];
    }, [dataSources]);

    // 生成字段列表（从 response.data 或 transformedData 推断）
    const inferFieldsFromResponse = (resp: any): Array<{ key: string; name: string; type: string }> => {
        const data = resp?.transformedData ?? resp?.data;
        if (!data) return [];
        const fields: Array<{ key: string; name: string; type: string }> = [];
        const pushFromObj = (obj: any) => {
            Object.entries(obj).forEach(([k, v], idx) => {
                const type = Array.isArray(v) ? 'array' : typeof v;
                fields.push({ key: `${k}-${idx}`, name: k, type: type });
            });
        };
        if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
            pushFromObj(data[0]);
        } else if (typeof data === 'object') {
            pushFromObj(data);
        } else {
            fields.push({ key: 'value', name: 'value', type: typeof data });
        }
        return fields;
    };

    // 保存为数据源
    const handleSaveAsDataSource = () => {
        if (!draftBlock || !draftBlock.response) {
            message.warning('请先发送请求以获取响应');
            return;
        }
        setSaveDsVisible(true);
        dsForm.setFieldsValue({ name: '' });
    };

    const submitSaveDataSource = () => {
        if (!draftBlock || !draftBlock.requestPanelRef?.current) return;
        dsForm.validateFields().then(() => {
            const name = dsForm.getFieldValue('name');
            const config = draftBlock.requestPanelRef!.current.getCurrentConfig?.() || {};
            const fields = inferFieldsFromResponse(draftBlock.response);
            const ds: DataSourceTemplate = {
                id: `${Date.now()}`,
                name,
                createdAt: new Date().toISOString(),
                config,
                fields,
            };
            setDataSources(prev => [...prev, ds]);
            message.success('数据源已保存');
            setSaveDsVisible(false);
        });
    };

    // 从数据源创建 Block
    const handleCreateFromDataSource = (ds: DataSourceTemplate) => {
        const newBlock: Block = {
            id: `block-${Date.now()}`,
            type: 'api-request',
            title: ds.name,
            response: null,
            requestPanelRef: React.createRef(),
            currentPagination: { current: 1, pageSize: 10, total: 0, totalPages: 0 },
            // 选择数据源直接进入仅展示模式
            displayOnly: true,
            // 注入初始配置，避免在状态未就绪时用默认 URL 请求
            initialConfig: ds.config as Partial<RequestPanelConfig>,
        };
        setBlocks(prev => [...prev, newBlock]);
        // 取消立即触发请求，交由子组件在分页 effect 中自动触发，确保 initialConfig 先应用
        // setTimeout(() => {
        //     const ref = newBlock.requestPanelRef?.current;
        //     if (ref?.setConfig) {
        //         ref.setConfig(ds.config);
        //     }
        //     if (ref?.triggerRequest) {
        //         ref.triggerRequest();
        //     }
        // }, 0);
    };

    // 菜单：合并默认与数据源
    const addBlockMenuItems: MenuProps['items'] = [
        {
            key: 'request-api',
            label: 'Request API',
            children: dataSourceMenuItems as any,
        },
    ];

    const handleOpenCreateModal = (type: string, title: string) => {
        const newDraft: Block = {
            id: `block-${Date.now()}`,
            type: type as 'api-request',
            title,
            response: null,
            requestPanelRef: React.createRef(),
            currentPagination: { current: 1, pageSize: 10, total: 0, totalPages: 0 },
        };
        setDraftBlock(newDraft);
        setIsCreateModalOpen(true);
    };

    const handleInsertBlockFromDraft = () => {
        if (!draftBlock) return;
        // 保存为仅展示 UI 的区块
        const finalized: Block = { ...draftBlock, displayOnly: true };
        setBlocks(prev => [...prev, finalized]);
        setIsCreateModalOpen(false);
        setDraftBlock(null);
    };

    const handleCancelCreateModal = () => {
        setIsCreateModalOpen(false);
        setDraftBlock(null);
    };

    const handleRemoveBlock = (blockId: string) => {
        setBlocks(prev => prev.filter(block => block.id !== blockId));
    };

    // 新增：手动刷新当前区块（基于其当前配置重新请求）
    const handleRefreshBlock = (blockId: string) => {
        const target = blocks.find(b => b.id === blockId);
        const ref = target?.requestPanelRef?.current;
        if (ref?.triggerRequest) {
            ref.triggerRequest();
        } else {
            message.warning('请求面板未就绪');
        }
    };

    // 新增：打开配置弹窗（读取当前配置，构造草稿块用于两栏预览编辑）
    const handleOpenEditModal = (blockId: string) => {
        const target = blocks.find(b => b.id === blockId) || null;
        if (!target) return;
        const currentCfg: Partial<RequestPanelConfig> | undefined = target.requestPanelRef?.current?.getCurrentConfig?.();
        setEditingBlock(target);
        setEditInitialConfig(currentCfg);
        // 基于当前块创建一个草稿块（独立的请求面板与响应/显示）
        const draft: Block = {
            id: `edit-${target.id}-${Date.now()}`,
            type: 'api-request',
            title: target.title,
            response: target.response || null,
            displayComponent: null,
            requestPanelRef: React.createRef(),
            currentPagination: target.currentPagination || { current: 1, pageSize: 10, total: 0, totalPages: 0 },
            displayOnly: false,
            initialConfig: currentCfg,
        };
        setEditDraftBlock(draft);
        setIsEditModalOpen(true);
    };

    // 新增：应用配置到隐藏请求面板
    const handleApplyEditConfig = () => {
        if (!editingBlock) return;
        const cfg: Partial<RequestPanelConfig> | undefined = editDraftBlock?.requestPanelRef?.current?.getCurrentConfig?.() || editInitialConfig;
        if (cfg && editingBlock.requestPanelRef?.current) {
            editingBlock.requestPanelRef.current.setConfig?.(cfg);
            editingBlock.requestPanelRef.current.triggerRequest?.();
            setBlocks(prev => prev.map(b => b.id === editingBlock.id ? { ...b, initialConfig: { ...(b.initialConfig || {}), ...cfg } } : b));
        }
        // 清理并关闭
        setIsEditModalOpen(false);
        setEditingBlock(null);
        setEditInitialConfig(undefined);
        setEditDraftBlock(null);
    };

    const handleResponse = (blockId: string, responseData: ResponseData) => {
        setBlocks(prev => prev.map(block =>
            block.id === blockId
                ? { ...block, response: responseData }
                : block
        ));
    };

    const handleDisplayUI = (blockId: string, displayData: React.ReactNode) => {
        setBlocks(prev => prev.map(block =>
            block.id === blockId
                ? { ...block, displayComponent: displayData }
                : block
        ));
    };

    const handlePaginationChange = (blockId: string, pagination: { current: number; pageSize: number }) => {
        // 仅更新该 block 的 UI 分页状态；请求面板会通过 props 感知变化并自动同步 params + 触发请求
        setBlocks(prev => prev.map(b => (
            b.id === blockId ? { ...b, currentPagination: { ...(b.currentPagination || { current: 1, pageSize: 10, total: 0 }), ...pagination } } : b
        )));
    };

    return (
        <Layout style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
            <Content style={{ padding: '24px' }}>
                {/* 添加块按钮 */}
                <div style={{ marginBottom: '24px' }}>
                    <Dropdown
                        menu={{ items: addBlockMenuItems }}
                        trigger={['hover']}
                        placement="bottomLeft"
                    >
                        <Button
                            type="dashed"
                            icon={<PlusOutlined />}
                            style={{
                                borderStyle: 'dashed',
                                borderColor: '#d9d9d9',
                                color: '#666',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            Add block <DownOutlined />
                        </Button>
                    </Dropdown>
                </div>

                {/* 渲染块 */}
                {blocks.map((block) => (
                    <Card
                        key={block.id}
                        style={{ marginBottom: '24px' }}
                        title={block.title}
                        extra={
                            <>
                                <Button
                                    type="default"
                                    size="small"
                                    icon={<SettingOutlined />}
                                    style={{ marginRight: 8 }}
                                    onClick={() => handleOpenEditModal(block.id)}
                                >
                                    配置
                                </Button>
                                {/* 新增：刷新按钮 */}
                                <Button
                                    type="default"
                                    size="small"
                                    icon={<ReloadOutlined />}
                                    style={{ marginRight: 8 }}
                                    onClick={() => handleRefreshBlock(block.id)}
                                >
                                    刷新
                                </Button>
                                <Button
                                    type="text"
                                    danger
                                    onClick={() => handleRemoveBlock(block.id)}
                                >
                                    ×
                                </Button>
                            </>
                        }
                    >
                        {/* displayOnly: 只展示 UI 表格 */}
                        {block.displayOnly ? (
                            <>
                                <Card style={{ minHeight: '200px' }}>
                                    {block.displayComponent ? (
                                        block.displayComponent
                                    ) : (
                                        <div style={{ textAlign: 'center', color: '#999', padding: 24 }}>
                                            表格尚未生成，请执行一次请求。
                                        </div>
                                    )}
                                </Card>
                                {/* 隐藏挂载请求/响应面板，用于自动请求与渲染 UI Display */}
                                <div style={{ display: 'none' }}>
                                    <ApiRequestPanel
                                        ref={block.requestPanelRef}
                                        blockId={block.id}
                                        onResponse={(response) => handleResponse(block.id, response)}
                                        currentPagination={block.currentPagination}
                                        // 新增：传入初始配置，确保用数据源配置请求
                                        initialConfig={block.initialConfig}
                                    />
                                    {block.response && (
                                        <ApiResponsePanel
                                            blockId={block.id}
                                            response={block.response}
                                            onDisplayUI={(displayData: React.ReactNode) => handleDisplayUI(block.id, displayData)}
                                            onPaginationChange={(pagination) => handlePaginationChange(block.id, pagination)}
                                        />
                                    )}
                                </div>
                            </>
                        ) : (
                            <Row gutter={24}>
                                <Col span={12}>
                                    <div>
                                        <ApiRequestPanel
                                            ref={block.requestPanelRef}
                                            blockId={block.id}
                                            onResponse={(response) => handleResponse(block.id, response)}
                                            // 将 UI 的分页状态传给请求面板
                                            currentPagination={block.currentPagination}
                                            // 兼容：非 displayOnly 场景也可传入初始配置（如后续扩展需要）
                                            initialConfig={block.initialConfig}
                                        />
                                        {block.response && (
                                            <div style={{ marginTop: '24px' }}>
                                                <ApiResponsePanel
                                                    blockId={block.id}
                                                    response={block.response}
                                                    onDisplayUI={(displayData: React.ReactNode) => handleDisplayUI(block.id, displayData)}
                                                    onPaginationChange={(pagination) => handlePaginationChange(block.id, pagination)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </Col>
                                <Col span={12}>
                                    {block.displayComponent && (
                                        <Card title="UI Display" style={{ minHeight: '400px' }}>
                                            {block.displayComponent}
                                        </Card>
                                    )}
                                    {!block.displayComponent && (
                                        <Card
                                            title="UI Display"
                                            style={{
                                                minHeight: '400px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <div style={{ textAlign: 'center', color: '#999' }}>
                                                <p>Send a request and click "Display on UI" to render components here</p>
                                            </div>
                                        </Card>
                                    )}
                                </Col>
                            </Row>
                        )}
                    </Card>
                ))}

                {/* 空状态 */}
                {blocks.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '100px 0',
                        color: '#999'
                    }}>
                        <p style={{ fontSize: '16px', marginBottom: '16px' }}>
                            No blocks yet
                        </p>
                        <p>Click "Add block" to get started</p>
                    </div>
                )}
            </Content>

            {/* 新增：编辑配置弹窗（两栏预览） */}
            <Modal
                title="配置请求"
                open={isEditModalOpen}
                width="90%"
                onCancel={() => { setIsEditModalOpen(false); setEditingBlock(null); setEditInitialConfig(undefined); setEditDraftBlock(null); }}
                footer={[
                    <Button key="cancel" onClick={() => { setIsEditModalOpen(false); setEditingBlock(null); setEditInitialConfig(undefined); setEditDraftBlock(null); }}>取消</Button>,
                    <Button key="apply" type="primary" onClick={handleApplyEditConfig}>保存并应用</Button>,
                ]}
                destroyOnHidden
            >
                {editDraftBlock && (
                    <Row gutter={24}>
                        <Col span={12}>
                            <div>
                                <ApiRequestPanel
                                    ref={editDraftBlock.requestPanelRef}
                                    blockId={editDraftBlock.id}
                                    onResponse={(response) => {
                                        // 草稿响应仅用于右侧预览
                                        setEditDraftBlock(prev => prev && prev.id === editDraftBlock.id ? { ...prev, response } : prev);
                                    }}
                                    currentPagination={editDraftBlock.currentPagination}
                                    initialConfig={editInitialConfig}
                                />
                                {editDraftBlock.response && (
                                    <div style={{ marginTop: 24 }}>
                                        <ApiResponsePanel
                                            blockId={editDraftBlock.id}
                                            response={editDraftBlock.response}
                                            onDisplayUI={(displayData: React.ReactNode) => {
                                                setEditDraftBlock(prev => prev && prev.id === editDraftBlock.id ? { ...prev, displayComponent: displayData } : prev);
                                            }}
                                            onPaginationChange={(pagination) => {
                                                setEditDraftBlock(prev => prev ? { ...prev, currentPagination: { ...(prev.currentPagination || { current: 1, pageSize: 10, total: 0 }), ...pagination } } : prev);
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </Col>
                        <Col span={12}>
                            <Card title="UI Display" style={{ minHeight: 400 }}>
                                {editDraftBlock.displayComponent ? (
                                    editDraftBlock.displayComponent
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#999' }}>
                                        <p>Send a request and click "Display on UI" to render components here</p>
                                    </div>
                                )}
                            </Card>
                        </Col>
                    </Row>
                )}
            </Modal>

            {/* 新增：创建 Block 的弹窗，左侧请求+响应，右侧 UI Display */}
            <Modal
                title="Create API Request"
                open={isCreateModalOpen}
                width="90%"
                onCancel={handleCancelCreateModal}
                footer={[
                    <Button key="save-ds" icon={<SaveOutlined />} onClick={handleSaveAsDataSource}>保存至数据源</Button>,
                    <Button key="cancel" onClick={handleCancelCreateModal}>取消</Button>,
                    <Button key="ok" type="primary" onClick={handleInsertBlockFromDraft}>保存</Button>,
                ]}
                destroyOnHidden
            >
                {draftBlock && (
                    <Row gutter={24}>
                        <Col span={12}>
                            <div>
                                <ApiRequestPanel
                                    ref={draftBlock.requestPanelRef}
                                    blockId={draftBlock.id}
                                    onResponse={(response) => {
                                        setDraftBlock(prev => prev && prev.id === draftBlock.id ? { ...prev, response } : prev);
                                    }}
                                    currentPagination={draftBlock.currentPagination}
                                />

                                {draftBlock.response && (
                                    <div style={{ marginTop: 24 }}>
                                        <ApiResponsePanel
                                            blockId={draftBlock.id}
                                            response={draftBlock.response}
                                            // 把 UI 组件缓存到草稿中，右侧 UI Display 实时展示
                                            onDisplayUI={(displayData: React.ReactNode) => {
                                                setDraftBlock(prev => prev && prev.id === draftBlock.id ? { ...prev, displayComponent: displayData } : prev);
                                            }}
                                            onPaginationChange={(pagination) => {
                                                setDraftBlock(prev => prev ? { ...prev, currentPagination: { ...(prev.currentPagination || { current: 1, pageSize: 10, total: 0 }), ...pagination } } : prev);
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </Col>
                        <Col span={12}>
                            <Card title="UI Display" style={{ minHeight: 400 }}>
                                {draftBlock.displayComponent ? (
                                    draftBlock.displayComponent
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#999' }}>
                                        <p>Send a request and click "Display on UI" to render components here</p>
                                    </div>
                                )}
                            </Card>
                        </Col>
                    </Row>
                )}
            </Modal>

            {/* 二次弹窗：保存为数据源 */}
            <Modal
                title="保存为数据源"
                open={saveDsVisible}
                onCancel={() => setSaveDsVisible(false)}
                onOk={submitSaveDataSource}
            >
                <Form form={dsForm} layout="vertical">
                    <Form.Item label="数据源名称" name="name" rules={[{ required: true, message: '请输入数据源名称' }]}>
                        <Input placeholder="如 用户列表数据源" />
                    </Form.Item>
                    <Form.Item label="响应字段预览">
                        <Table
                            size="small"
                            pagination={false}
                            columns={[
                                { title: '字段名', dataIndex: 'name', key: 'name' },
                                { title: '类型', dataIndex: 'type', key: 'type' },
                            ]}
                            dataSource={draftBlock?.response ? inferFieldsFromResponse(draftBlock.response) : []}
                            rowKey={(r) => r.key}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </Layout>
    );
};

export default App;
