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
                                            blockId={block.id}
                                            onResponse={(response) => handleResponse(block.id, response)}
                                        />
                                        {block.response && (
                                            <div style={{ marginTop: '24px' }}>
                                                <ApiResponsePanel
                                                    blockId={block.id}
                                                    response={block.response}
                                                    onDisplayUI={(displayData: React.ReactNode) => handleDisplayUI(block.id, displayData)}
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
