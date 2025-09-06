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
}
