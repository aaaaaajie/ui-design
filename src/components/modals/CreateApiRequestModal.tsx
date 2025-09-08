import React from 'react';
import { Modal, Button, Row, Col, Card } from 'antd';
import ApiRequestPanel from '../ApiRequestPanel';
import ApiResponsePanel from '../ApiResponsePanel';
import type { Block } from '../../types/api';

type Props = {
  open: boolean;
  draftBlock: Block | null;
  canDisplayOnUI: boolean;
  onCancel: () => void;
  onSave: () => void; // 打开保存（数据源/集合选择）弹窗
  onInsertDisplay: () => void; // 插入到 UI（Display on UI）
  setDraftBlock: React.Dispatch<React.SetStateAction<Block | null>>;
};

const CreateApiRequestModal: React.FC<Props> = ({
  open,
  draftBlock,
  canDisplayOnUI,
  onCancel,
  onSave,
  onInsertDisplay,
  setDraftBlock,
}) => {
  return (
    <Modal
      title="Create API Request"
      open={open}
      width="90%"
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>取消</Button>,
        canDisplayOnUI ? (
          <Button key="display" type="primary" onClick={onInsertDisplay}>Display on UI</Button>
        ) : null,
        <Button key="ok" type="primary" onClick={onSave}>保存</Button>,
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
                // 新增：传递排序状态
                currentSorter={draftBlock.currentSorter}
                // 新增：传递筛选状态
                currentFilter={draftBlock.currentFilter}
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
                    // 新增：Schema 初始值与回传
                    initialSelectedPaths={draftBlock.selectedPaths}
                    initialAliasMap={draftBlock.aliasMap}
                    onSchemaChange={(payload) => setDraftBlock(prev => prev ? { ...prev, selectedPaths: payload.selectedPaths, aliasMap: payload.aliasMap } : prev)}
                    // 新增：排序变化上抛存入草稿
                    onSorterChange={(s) => setDraftBlock(prev => prev ? { ...prev, currentSorter: s } : prev)}
                    // 新增：筛选变化上抛存入草稿
                    onFilterChange={(f) => setDraftBlock(prev => prev ? { ...prev, currentFilter: f } : prev)}
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
  );
};

export default CreateApiRequestModal;
