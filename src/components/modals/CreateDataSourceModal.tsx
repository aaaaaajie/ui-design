import React from 'react';
import { Modal, Form, Input } from 'antd';

interface Props {
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
  form: any;
}

const CreateDataSourceModal: React.FC<Props> = ({ open, onCancel, onOk, form }) => {
  return (
    <Modal title="新建数据源" open={open} onCancel={onCancel} onOk={onOk} destroyOnClose>
      <Form form={form} layout="vertical">
        <Form.Item label="标识" name="identifier" rules={[{ required: true, message: '请输入标识' }]}>
          <Input placeholder="如 userService" />
        </Form.Item>
        <Form.Item label="数据源名称" name="name" rules={[{ required: true, message: '请输入数据源名称' }]}>
          <Input placeholder="如 用户服务" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateDataSourceModal;
