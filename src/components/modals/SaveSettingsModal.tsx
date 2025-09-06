import React from 'react';
import { Modal, Form, Select } from 'antd';
import type { DataSourceTemplate, Collection } from '../../types/api';

interface Props {
  open: boolean;
  dataSources: DataSourceTemplate[];
  collectionsByDs: Record<string, Collection[]>;
  selectedDsId: string | null;
  selectedCollectionId: string | null;
  onChangeDs: (id: string) => void;
  onChangeCollection: (id: string) => void;
  onCancel: () => void;
  onOk: () => void;
}

const SaveSettingsModal: React.FC<Props> = ({
  open,
  dataSources,
  collectionsByDs,
  selectedDsId,
  selectedCollectionId,
  onChangeDs,
  onChangeCollection,
  onCancel,
  onOk,
}) => {
  return (
    <Modal title="保存设置" open={open} onCancel={onCancel} onOk={onOk} destroyOnClose>
      <Form layout="vertical">
        <Form.Item label="数据源">
          <Select
            placeholder="选择已有数据源或新建"
            value={selectedDsId ?? undefined}
            onChange={onChangeDs}
            options={[
              { label: '已有数据源', options: dataSources.map(ds => ({ label: ds.name, value: ds.id })) },
              { label: '操作', options: [{ label: '新建数据源', value: '__create__' }] },
            ]}
            allowClear
          />
        </Form.Item>
        <Form.Item label="集合">
          <Select
            placeholder="选择已有集合或新建"
            value={selectedCollectionId ?? undefined}
            onChange={onChangeCollection}
            disabled={!selectedDsId}
            options={[
              { label: '已有集合', options: (selectedDsId ? (collectionsByDs[selectedDsId] || []) : []).map(c => ({ label: c.name, value: c.id })) },
              { label: '操作', options: [{ label: '新建集合', value: '__create__' }] },
            ]}
            allowClear
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SaveSettingsModal;
