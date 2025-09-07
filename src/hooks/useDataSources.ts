import { useState } from 'react';
import { Form, message } from 'antd';
import type { DataSourceTemplate, Collection, Block } from '../types/api';

const inferFieldsFromResponse = (resp: any): Array<{ key: string; name: string; type: string }> => {
  const data = resp?.transformedData ?? resp?.data;
  if (!data) return [];
  const fields: Array<{ key: string; name: string; type: string }> = [];
  const typeOf = (v: any): string => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
  const pushFromObj = (obj: any) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
    Object.entries(obj).forEach(([k, v], idx) => {
      const type = typeOf(v);
      fields.push({ key: `${k}-${idx}`, name: k, type });
    });
  };
  if (Array.isArray(data) && data.length > 0) {
    const firstObj = data.find((it: any) => it !== null && typeof it === 'object' && !Array.isArray(it));
    if (firstObj) pushFromObj(firstObj);
  } else if (data !== null && typeof data === 'object') {
    pushFromObj(data);
  } else {
    fields.push({ key: 'value', name: 'value', type: typeOf(data) });
  }
  return fields;
};

export default function useDataSources() {
  const [dataSources, setDataSources] = useState<DataSourceTemplate[]>([]);
  const [collectionsByDs, setCollectionsByDs] = useState<Record<string, Collection[]>>({});
  const [selectedDsId, setSelectedDsId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  const [isCreateDsModalOpen, setIsCreateDsModalOpen] = useState(false);
  const [isCreateCollModalOpen, setIsCreateCollModalOpen] = useState(false);

  const [createDsForm] = Form.useForm();
  const [createCollForm] = Form.useForm();

  const handleDsChange = (value: string) => {
    if (value === '__create__') {
      setIsCreateDsModalOpen(true);
      return;
    }
    setSelectedDsId(value);
    const firstCollId = collectionsByDs[value]?.[0]?.id || null;
    setSelectedCollectionId(firstCollId);
  };

  const handleCollectionChange = (value: string) => {
    if (value === '__create__') {
      if (!selectedDsId) {
        message.warning('请先选择数据源');
        return;
      }
      setIsCreateCollModalOpen(true);
      return;
    }
    setSelectedCollectionId(value);
  };

  const handleCreateDsSubmit = (draftBlock?: Block | null) => {
    const block = draftBlock;
    if (!block) {
      message.warning('草稿未就绪');
      return;
    }
    createDsForm
      .validateFields()
      .then((values) => {
        const { identifier, name } = values as { identifier: string; name: string };
        const config = block.requestPanelRef?.current?.getCurrentConfig?.() || {};
        const fields = block.response ? inferFieldsFromResponse(block.response) : [];
        const newDs: DataSourceTemplate = {
          id: `ds-${Date.now()}`,
          identifier,
          name,
          createdAt: new Date().toISOString(),
          config,
          fields,
        };
        setDataSources(prev => [...prev, newDs]);
        setCollectionsByDs(prev => ({ ...prev, [newDs.id]: prev[newDs.id] || [] }));
        setSelectedDsId(newDs.id);
        setSelectedCollectionId(null);
        setIsCreateDsModalOpen(false);
        createDsForm.resetFields();
        message.success('数据源已创建');
      })
      .catch(() => {});
  };

  const handleCreateCollectionSubmit = () => {
    if (!selectedDsId) {
      message.warning('请先选择数据源');
      return;
    }
    createCollForm
      .validateFields()
      .then((values) => {
        const { identifier, name, description } = values as { identifier: string; name: string; description?: string };
        const newColl: Collection = {
          id: `col-${Date.now()}`,
          identifier,
          name,
          description,
          dataSourceId: selectedDsId,
          createdAt: new Date().toISOString(),
        };
        setCollectionsByDs(prev => {
          const list = prev[selectedDsId] || [];
          return { ...prev, [selectedDsId]: [...list, newColl] };
        });
        setSelectedCollectionId(newColl.id);
        setIsCreateCollModalOpen(false);
        createCollForm.resetFields();
        message.success('集合已创建');
      })
      .catch(() => {});
  };

  return {
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
  };
}
