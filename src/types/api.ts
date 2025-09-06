import React from 'react';
import type { RequestPanelConfig } from '../components/ApiRequestPanel';

export interface ResponseData {
  status?: number;
  statusText?: string;
  headers?: Record<string, any>;
  data?: any;
  paginationMapping?: any;
  config?: any;
  timestamp?: string;
  error?: boolean;
}

export interface Block {
  id: string;
  type: 'api-request';
  title: string;
  response?: ResponseData | null;
  displayComponent?: React.ReactNode;
  requestPanelRef?: React.RefObject<any>;
  currentPagination?: { current: number; pageSize: number; total: number; totalPages?: number };
  displayOnly?: boolean;
  initialConfig?: Partial<RequestPanelConfig>;
  isPlaceholder?: boolean;
  // 新增：Schema 选择与别名持久化
  selectedPaths?: string[];
  aliasMap?: Record<string, string>;
}

export interface Collection {
  id: string;
  identifier: string;
  name: string;
  description?: string;
  dataSourceId: string;
  createdAt: string;
}

export interface DataSourceTemplate {
  id: string;
  name: string;
  createdAt: string;
  config: any;
  fields: Array<{ key: string; name: string; type: string }>;
  identifier?: string;
}
