import type React from 'react';

export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'isEmpty'
  | 'isNotEmpty';

export interface Condition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string; // 空值类操作符不使用该值
}

export interface ResponseData {
  status?: number;
  statusText?: string;
  headers?: Record<string, any>;
  data?: any;
  transformedData?: any; // 转换后的数据
  paginationMapping?: any; // 分页映射配置
  config?: any;
  timestamp?: string;
  error?: boolean;
}

export interface ApiResponsePanelProps {
  blockId: string;
  response?: ResponseData | null;
  onDisplayUI?: (component: React.ReactNode) => void;
  onCreateVariable?: (variableData: { name: string; value: string; type: string; source: string }) => void;
  onPaginationChange?: (pagination: { current: number; pageSize: number }) => void;
  // 新增：用于在外层持久化并回填 Schema 勾选与别名
  initialSelectedPaths?: string[];
  initialAliasMap?: Record<string, string>;
  onSchemaChange?: (payload: { selectedPaths: string[]; aliasMap: Record<string, string> }) => void;
  // 新增：排序变化回调（表格列头点击时触发）
  onSorterChange?: (sorter: { field?: string; order?: 'ascend' | 'descend' | null }) => void;
  // 新增：筛选变化回调（向外暴露 Noco 风格 filter）
  onFilterChange?: (filter: any | null) => void;
}
