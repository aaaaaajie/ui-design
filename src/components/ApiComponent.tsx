import React, { useState } from 'react';
import { Button, Dropdown, Layout, Row, Col, Card } from 'antd';
import { PlusOutlined, DownOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import ApiRequestPanel from './ApiRequestPanel';
import ApiResponsePanel from './ApiResponsePanel';

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
}

const App: React.FC = () => {
    const [blocks, setBlocks] = useState<Block[]>([]);

    // 添加块的菜单项
    const addBlockMenuItems: MenuProps['items'] = [
        {
            key: 'request-api',
            label: 'Request API',
            children: [
                {
                    key: 'blank-block',
                    label: 'Blank Block',
                    onClick: () => handleAddBlock('api-request', 'API Request'),
                },
            ],
        },
    ];

    const handleAddBlock = (type: string, title: string) => {
        const newBlock: Block = {
            id: `block-${Date.now()}`,
            type: type as 'api-request',
            title,
            response: null,
            requestPanelRef: React.createRef(),
            // 默认分页
            currentPagination: { current: 1, pageSize: 10, total: 0, totalPages: 0 },
        };
        setBlocks(prev => [...prev, newBlock]);
    };

    const handleRemoveBlock = (blockId: string) => {
        setBlocks(prev => prev.filter(block => block.id !== blockId));
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
                            <Button
                                type="text"
                                danger
                                onClick={() => handleRemoveBlock(block.id)}
                            >
                                ×
                            </Button>
                        }
                    >
                        {block.type === 'api-request' && (
                            <Row gutter={24}>
                                <Col span={12}>
                                    <div>
                                        <ApiRequestPanel
                                            ref={block.requestPanelRef}
                                            blockId={block.id}
                                            onResponse={(response) => handleResponse(block.id, response)}
                                            // 将 UI 的分页状态传给请求面板
                                            currentPagination={block.currentPagination}
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
        </Layout>
    );
};

export default App;
