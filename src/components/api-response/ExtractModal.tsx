import React from 'react';
import { Modal, Button, Checkbox, Divider, Table, Typography, message } from 'antd';
import { generateTableColumns, projectSelected } from './utils';

const { Text } = Typography;

export default function ExtractModal({
  open,
  extractedPath,
  extractBaseData,
  rootFieldOptions,
  childFieldOptions,
  selectedRootFields,
  selectedChildFields,
  onChangeRootFields,
  onChangeChildFields,
  onClose,
  onApply,
}: {
  open: boolean;
  extractedPath: string;
  extractBaseData: any;
  rootFieldOptions: string[];
  childFieldOptions: string[];
  selectedRootFields: string[];
  selectedChildFields: string[];
  onChangeRootFields: (vals: string[]) => void;
  onChangeChildFields: (vals: string[]) => void;
  onClose: () => void;
  onApply: (full: any[]) => void;
}) {
  const projectedPreview = React.useMemo(() => {
    if (!extractBaseData || !extractedPath) return [] as any[];
    return projectSelected(
      extractBaseData,
      selectedRootFields,
      selectedChildFields,
      extractedPath
    ).slice(0, 5);
  }, [extractBaseData, extractedPath, selectedRootFields, selectedChildFields]);

  return (
    <Modal
      title={`提取字段 - ${extractedPath}`}
      open={open}
      width={840}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="apply"
          type="primary"
          disabled={selectedChildFields.length === 0}
          onClick={() => {
            if (!extractBaseData || !extractedPath) return;
            const full = projectSelected(
              extractBaseData,
              selectedRootFields,
              selectedChildFields,
              extractedPath
            );
            onApply(full);
            message.success('已应用到 UI');
          }}
        >
          应用到 UI
        </Button>,
      ]}
    >
      <div>
        <Text strong>选择外层字段</Text>
        <div style={{ marginTop: 8 }}>
          {rootFieldOptions.length ? (
            <Checkbox.Group
              options={rootFieldOptions.map((v) => ({ label: v, value: v }))}
              value={selectedRootFields}
              onChange={(vals) => onChangeRootFields(vals as string[])}
            />
          ) : (
            <Text type="secondary">无可选外层字段</Text>
          )}
        </div>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <div>
        <Text strong>选择子字段（来自 {extractedPath}）</Text>
        <div style={{ marginTop: 8 }}>
          {childFieldOptions.length ? (
            <Checkbox.Group
              options={childFieldOptions.map((v) => ({ label: `${extractedPath}.${v}`, value: v }))}
              value={selectedChildFields}
              onChange={(vals) => onChangeChildFields(vals as string[])}
            />
          ) : (
            <Text type="secondary">该值不是对象/对象数组，暂无子字段可选</Text>
          )}
        </div>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <Text strong>预览（前 5 行）</Text>
      <div style={{ marginTop: 8 }}>
        <Table
          size="small"
          columns={generateTableColumns(projectedPreview)}
          dataSource={projectedPreview}
          pagination={false}
          scroll={{ x: true }}
        />
      </div>
    </Modal>
  );
}
