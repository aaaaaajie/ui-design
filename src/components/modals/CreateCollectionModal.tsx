import React from 'react';
import { Modal, Form, Input } from 'antd';

interface Props {
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
  form: any;
}

const CreateCollectionModal: React.FC<Props> = ({ open, onCancel, onOk, form }) => {
  return (
    <Modal title="新建集合" open={open} onCancel={onCancel} onOk={onOk} destroyOnClose>
      <Form form={form} layout="vertical">
        <Form.Item label="集合标识" name="identifier" rules={[{ required: true, message: '请输入集合标识' }]}>
          <Input placeholder="如 userList" />
        </Form.Item>
        <Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="如 用户列表" />
        </Form.Item>
        <Form.Item label="描述" name="description">
          <Input.TextArea placeholder="可选" rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateCollectionModal;
