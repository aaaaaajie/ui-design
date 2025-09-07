import React, { useState } from 'react';
import { Button, Dropdown, Layout, message, Modal, Row, Col, Card } from 'antd';
import { PlusOutlined, DownOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import ApiRequestPanel from './ApiRequestPanel';
import ApiResponsePanel from './ApiResponsePanel';
import type { RequestPanelConfig } from './ApiRequestPanel';
import type { Block, DataSourceTemplate, ResponseData } from '../types/api';
import SaveSettingsModal from './modals/SaveSettingsModal';
import CreateDataSourceModal from './modals/CreateDataSourceModal';
import CreateCollectionModal from './modals/CreateCollectionModal';
import CreateApiRequestModal from './modals/CreateApiRequestModal';
import BlockCard from './blocks/BlockCard.tsx';
import useDataSources from '../hooks/useDataSources.ts';

const { Content } = Layout;

const App: React.FC = () => {
    const [blocks, setBlocks] = useState<Block[]>([]);

    const {
        dataSources,
        collectionsByDs,
        selectedDsId,
        selectedCollectionId,
        isCreateDsModalOpen,
        isCreateCollModalOpen,
        setIsCreateDsModalOpen,
        setIsCreateCollModalOpen,
        createDsForm,
        createCollForm,
        handleDsChange,
        handleCollectionChange,
        handleCreateDsSubmit,
        handleCreateCollectionSubmit,
    } = useDataSources();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [draftBlock, setDraftBlock] = useState<Block | null>(null);
    const [targetPlaceholderId, setTargetPlaceholderId] = useState<string | null>(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingBlock, setEditingBlock] = useState<Block | null>(null);
    const [editInitialConfig, setEditInitialConfig] = useState<Partial<RequestPanelConfig> | undefined>(undefined);
    const [editDraftBlock, setEditDraftBlock] = useState<Block | null>(null);

    const [isDsCollModalOpen, setIsDsCollModalOpen] = useState(false);
    const [canDisplayOnUI, setCanDisplayOnUI] = useState(false);

    const handleAddRequestApi = () => {
        const placeholder: Block = {
            id: `block-${Date.now()}`,
            type: 'api-request',
            title: 'Request API',
            isPlaceholder: true,
        };
        setBlocks(prev => [...prev, placeholder]);
    };

    const buildConfigureMenuItems = (placeholderId: string): MenuProps['items'] => {
        const dsItems: Required<MenuProps>['items'] = dataSources.map((ds: DataSourceTemplate) => ({
            key: `ds-${ds.id}`,
            label: ds.name,
            onClick: () => handleConfigureSelectDataSource(placeholderId, ds),
        }));
        const divider = dsItems.length ? [{ type: 'divider' as const }] : [];
        return [
            ...dsItems,
            ...divider,
            { key: 'blank-block', label: 'Blank Block', onClick: () => handleConfigureSelectBlank(placeholderId) },
        ];
    };

    const handleConfigureSelectDataSource = (placeholderId: string, ds: DataSourceTemplate) => {
        const updated: Block = {
            id: placeholderId,
            type: 'api-request',
            title: ds.name,
            response: null,
            requestPanelRef: React.createRef(),
            currentPagination: { current: 1, pageSize: 10, total: 0, totalPages: 0 },
            displayOnly: true,
            initialConfig: ds.config as Partial<RequestPanelConfig>,
        };
        setBlocks(prev => prev.map(b => (b.id === placeholderId ? updated : b)));
    };

    const handleConfigureSelectBlank = (placeholderId: string) => {
        setTargetPlaceholderId(placeholderId);
        handleOpenCreateModal('api-request', 'API Request');
    };

    const addMenuItems: MenuProps['items'] = [
        { key: 'group-data-blocks', label: <span style={{ color: '#9aa0a6' }}>Data blocks</span>, disabled: true },
        {
            key: 'table',
            label: 'Table',
            children: [
                { key: 'main', label: 'Main', onClick: () => { } },
                { type: 'divider' as const },
                { key: 'new-request-api', label: 'New Request API', onClick: handleAddRequestApi },
            ],
        },
        {
            key: 'form',
            label: 'Form',
            children: [
                { key: 'main', label: 'Main', onClick: () => { } },
                { type: 'divider' as const },
                { key: 'new-request-api', label: 'New Request API', onClick: handleAddRequestApi },
            ],
        },
        {
            key: 'detail',
            label: 'Detail',
            children: [
                { key: 'main', label: 'Main', onClick: () => { } },
                { type: 'divider' as const },
                { key: 'new-request-api', label: 'New Request API', onClick: handleAddRequestApi },
            ],
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
        const cfg: Partial<RequestPanelConfig> = draftBlock.requestPanelRef?.current?.getCurrentConfig?.() || {};
        const finalized: Block = { ...draftBlock, displayOnly: true, initialConfig: cfg };

        if (targetPlaceholderId) {
            setBlocks(prev => prev.map(b => (b.id === targetPlaceholderId ? { ...finalized, id: targetPlaceholderId } : b)));
        } else {
            setBlocks(prev => [...prev, finalized]);
        }
        setIsCreateModalOpen(false);
        setDraftBlock(null);
        setTargetPlaceholderId(null);
        setCanDisplayOnUI(false);
    };

    const handleOpenDsCollModal = () => {
        setIsDsCollModalOpen(true);
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
        setBlocks(prev => prev.map(b => (
            b.id === blockId ? { ...b, currentPagination: { ...(b.currentPagination || { current: 1, pageSize: 10, total: 0 }), ...pagination } } : b
        )));
    };

    // 新增：保存 Schema 勾选与别名
    const handleSchemaChange = (blockId: string, payload: { selectedPaths: string[]; aliasMap: Record<string, string> }) => {
        setBlocks(prev => prev.map(b => (
            b.id === blockId ? { ...b, selectedPaths: payload.selectedPaths, aliasMap: payload.aliasMap } : b
        )));
    };

    // 新增：表格排序变化 —— 更新 block.currentSorter 并透传到 ApiRequestPanel
    const handleSorterChange = (blockId: string, sorter: { field?: string; order?: 'ascend' | 'descend' | null }) => {
        setBlocks(prev => prev.map(b => (
            b.id === blockId ? { ...b, currentSorter: sorter } : b
        )));
        // ApiRequestPanel 内部 useEffect 会监听 props.currentSorter 并自动注入参数与触发请求
    };

    const handleRemoveBlock = (blockId: string) => {
        setBlocks(prev => prev.filter(block => block.id !== blockId));
    };

    const handleRefreshBlock = (blockId: string) => {
        const target = blocks.find(b => b.id === blockId);
        const ref = target?.requestPanelRef?.current;
        if (ref?.triggerRequest) {
            ref.triggerRequest();
        } else {
            message.warning('请求面板未就绪');
        }
    };

    const handleOpenEditModal = (blockId: string) => {
        const target = blocks.find(b => b.id === blockId) || null;
        if (!target) return;
        const currentCfg: Partial<RequestPanelConfig> | undefined = target.requestPanelRef?.current?.getCurrentConfig?.();
        setEditingBlock(target);
        setEditInitialConfig(currentCfg);
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
            // 带入当前 Schema 选择与别名，便于编辑态沿用
            selectedPaths: target.selectedPaths,
            aliasMap: target.aliasMap,
        };
        setEditDraftBlock(draft);
        setIsEditModalOpen(true);
    };

    const handleApplyEditConfig = () => {
        if (!editingBlock) return;
        const cfg: Partial<RequestPanelConfig> | undefined = editDraftBlock?.requestPanelRef?.current?.getCurrentConfig?.() || editInitialConfig;
        if (cfg && editingBlock.requestPanelRef?.current) {
            editingBlock.requestPanelRef.current.setConfig?.(cfg);
            editingBlock.requestPanelRef.current.triggerRequest?.();
            setBlocks(prev => prev.map(b => b.id === editingBlock.id ? { ...b, initialConfig: { ...(b.initialConfig || {}), ...cfg } } : b));
        }
        setIsEditModalOpen(false);
        setEditingBlock(null);
        setEditInitialConfig(undefined);
        setEditDraftBlock(null);
    };

    return (
        <Layout style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
            <Content style={{ padding: '24px' }}>
                {/* 渲染块 */}
                {blocks.map((block) => (
                    <BlockCard
                        key={block.id}
                        block={block}
                        buildConfigureMenuItems={buildConfigureMenuItems}
                        onRemove={handleRemoveBlock}
                        onRefresh={handleRefreshBlock}
                        onOpenEdit={handleOpenEditModal}
                        onResponse={handleResponse}
                        onDisplayUI={handleDisplayUI}
                        onPaginationChange={handlePaginationChange}
                        onSchemaChange={handleSchemaChange}
                        // 新增：排序变化
                        onSorterChange={handleSorterChange}
                    />
                ))}

                {/* 添加块按钮（底部） */}
                <div style={{ marginTop: '24px' }}>
                    <Dropdown
                        menu={{ items: addMenuItems }}
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
            </Content>

            {/* 编辑配置弹窗（保留） */}
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
                                    onResponse={(response: any) => {
                                        // 草稿响应仅用于右侧预览
                                        setEditDraftBlock(prev => prev && prev.id === editDraftBlock.id ? { ...prev, response } : prev);
                                    }}
                                    currentPagination={editDraftBlock.currentPagination}
                                    initialConfig={editInitialConfig}
                                    // 新增：传递当前排序
                                    currentSorter={editDraftBlock.currentSorter}
                                />
                                {editDraftBlock.response && (
                                    <div style={{ marginTop: 24 }}>
                                        <ApiResponsePanel
                                            blockId={editDraftBlock.id}
                                            response={editDraftBlock.response}
                                            onDisplayUI={(displayData: React.ReactNode) => {
                                                setEditDraftBlock(prev => prev && prev.id === editDraftBlock.id ? { ...prev, displayComponent: displayData } : prev);
                                            }}
                                            onPaginationChange={(pagination: any) => {
                                                setEditDraftBlock(prev => prev ? { ...prev, currentPagination: { ...(prev.currentPagination || { current: 1, pageSize: 10, total: 0 }), ...pagination } } : prev);
                                            }}
                                            // 新增：Schema 初始值与回传
                                            initialSelectedPaths={editDraftBlock.selectedPaths}
                                            initialAliasMap={editDraftBlock.aliasMap}
                                            onSchemaChange={(payload) => setEditDraftBlock(prev => prev ? { ...prev, selectedPaths: payload.selectedPaths, aliasMap: payload.aliasMap } : prev)}
                                            // 新增：排序变化上抛
                                            onSorterChange={(s) => setEditDraftBlock(prev => prev ? { ...prev, currentSorter: s } : prev)}
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

            {/* 创建 Block 的弹窗 —— 使用独立组件 */}
            <CreateApiRequestModal
                open={isCreateModalOpen}
                draftBlock={draftBlock}
                canDisplayOnUI={canDisplayOnUI}
                onCancel={() => { setIsCreateModalOpen(false); setDraftBlock(null); }}
                onSave={handleOpenDsCollModal}
                onInsertDisplay={handleInsertBlockFromDraft}
                setDraftBlock={setDraftBlock}
            />

            {/* 保存设置 —— 选择数据源与集合 */}
            <SaveSettingsModal
                open={isDsCollModalOpen}
                dataSources={dataSources}
                collectionsByDs={collectionsByDs}
                selectedDsId={selectedDsId}
                selectedCollectionId={selectedCollectionId}
                onChangeDs={handleDsChange}
                onChangeCollection={handleCollectionChange}
                onCancel={() => setIsDsCollModalOpen(false)}
                onOk={() => { setIsDsCollModalOpen(false); setCanDisplayOnUI(true); message.success('已保存设置'); }}
            />

            {/* 新建数据源 */}
            <CreateDataSourceModal
                open={isCreateDsModalOpen}
                onCancel={() => setIsCreateDsModalOpen(false)}
                onOk={() => handleCreateDsSubmit(draftBlock)}
                form={createDsForm}
            />

            {/* 新建集合 */}
            <CreateCollectionModal
                open={isCreateCollModalOpen}
                onCancel={() => setIsCreateCollModalOpen(false)}
                onOk={handleCreateCollectionSubmit}
                form={createCollForm}
            />
        </Layout>
    );
};

export default App;
