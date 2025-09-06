import React from 'react';
import { Button, Card, Dropdown, Row, Col } from 'antd';
import { SettingOutlined, ReloadOutlined } from '@ant-design/icons';
import ApiRequestPanel from '../ApiRequestPanel';
import ApiResponsePanel from '../ApiResponsePanel';
import type { Block } from '../../types/api';
import type { MenuProps } from 'antd';

interface Props {
  block: Block;
  buildConfigureMenuItems: (placeholderId: string) => MenuProps['items'];
  onRemove: (blockId: string) => void;
  onRefresh: (blockId: string) => void;
  onOpenEdit: (blockId: string) => void;
  onResponse: (blockId: string, response: any) => void;
  onDisplayUI: (blockId: string, displayData: React.ReactNode) => void;
  onPaginationChange: (blockId: string, pagination: { current: number; pageSize: number }) => void;
  // 新增：Schema 选择/别名变更
  onSchemaChange?: (blockId: string, payload: { selectedPaths: string[]; aliasMap: Record<string, string> }) => void;
}

const BlockCard: React.FC<Props> = ({ block, buildConfigureMenuItems, onRemove, onRefresh, onOpenEdit, onResponse, onDisplayUI, onPaginationChange, onSchemaChange }) => {
  return (
    <Card
      key={block.id}
      style={{ marginBottom: '24px' }}
      title={block.title}
      extra={
        block.isPlaceholder ? (
          <Button type="text" danger onClick={() => onRemove(block.id)}>×</Button>
        ) : (
          <>
            <Button
              type="default"
              size="small"
              icon={<SettingOutlined />}
              style={{ marginRight: 8 }}
              onClick={() => onOpenEdit(block.id)}
            >
              配置
            </Button>
            <Button
              type="default"
              size="small"
              icon={<ReloadOutlined />}
              style={{ marginRight: 8 }}
              onClick={() => onRefresh(block.id)}
            >
              刷新
            </Button>
            <Button
              type="text"
              danger
              onClick={() => onRemove(block.id)}
            >
              ×
            </Button>
          </>
        )
      }
    >
      {block.isPlaceholder ? (
        <div style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Dropdown
            menu={{ items: buildConfigureMenuItems(block.id) || [] }}
            trigger={['hover']}
            placement="bottomCenter"
          >
            <Button type="primary" ghost>configure</Button>
          </Dropdown>
        </div>
      ) : (
        block.displayOnly ? (
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
            <div style={{ display: 'none' }}>
              <ApiRequestPanel
                ref={block.requestPanelRef}
                blockId={block.id}
                onResponse={(response) => onResponse(block.id, response)}
                currentPagination={block.currentPagination}
                initialConfig={block.initialConfig}
              />
              {block.response && (
                <ApiResponsePanel
                  blockId={block.id}
                  response={block.response}
                  onDisplayUI={(displayData: React.ReactNode) => onDisplayUI(block.id, displayData)}
                  onPaginationChange={(pagination) => onPaginationChange(block.id, pagination)}
                  // 新增：Schema 初始值与回调
                  initialSelectedPaths={block.selectedPaths}
                  initialAliasMap={block.aliasMap}
                  onSchemaChange={(payload) => onSchemaChange?.(block.id, payload)}
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
                  onResponse={(response) => onResponse(block.id, response)}
                  currentPagination={block.currentPagination}
                  initialConfig={block.initialConfig}
                />
                {block.response && (
                  <div style={{ marginTop: '24px' }}>
                    <ApiResponsePanel
                      blockId={block.id}
                      response={block.response}
                      onDisplayUI={(displayData: React.ReactNode) => onDisplayUI(block.id, displayData)}
                      onPaginationChange={(pagination) => onPaginationChange(block.id, pagination)}
                      // 新增：Schema 初始值与回调
                      initialSelectedPaths={block.selectedPaths}
                      initialAliasMap={block.aliasMap}
                      onSchemaChange={(payload) => onSchemaChange?.(block.id, payload)}
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
        )
      )}
    </Card>
  );
};

export default BlockCard;
