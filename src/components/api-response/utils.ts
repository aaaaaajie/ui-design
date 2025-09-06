import React from 'react';

// 从对象按路径取值 a.b.c
export function getNestedValue(obj: any, path: string): any {
  if (!path) return undefined;
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// 安全展示任意单元格值
export function safeToDisplay(value: any): React.ReactNode {
  if (value === null || value === undefined) return '' as any;
  // @ts-ignore
  if (React.isValidElement && React.isValidElement(value)) return value;
  const t = typeof value;
  if (t === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return Object.prototype.toString.call(value);
    }
  }
  return String(value);
}

// 将数据标准化为表格数组
export function normalizeToArray(data: any): any[] {
  if (Array.isArray(data))
    return data.map((it, idx) =>
      typeof it === 'object' && it !== null ? { key: idx, ...it } : { key: idx, value: it }
    );
  if (data && typeof data === 'object') return [{ key: 0, ...data }];
  return [{ key: 0, value: data }];
}

// 根据数据生成表格列（避免在 .ts 文件中使用 JSX）
export function generateTableColumns(rows: any[]): any[] {
  const first = Array.isArray(rows) && rows.length > 0 ? rows[0] : undefined;
  if (!first || typeof first !== 'object') return [];
  const keys = Object.keys(first).filter((k) => k !== 'key');
  return keys.map((k) => ({
    title: k,
    dataIndex: k,
    key: k,
    ellipsis: true,
    render: (val: any) => {
      const titleStr =
        typeof val === 'object'
          ? (() => {
              try {
                return JSON.stringify(val);
              } catch {
                return '';
              }
            })()
          : String(val);
      return React.createElement('span', { title: titleStr as string }, safeToDisplay(val));
    },
  }));
}

export const normalizeResponsePath = (path?: string): string => {
  if (!path) return '';
  let p = String(path).trim();
  if (p.startsWith('response.data.')) return p.replace(/^response\.data\./, '');
  if (p.startsWith('data.')) return p.replace(/^data\./, '');
  return p;
};

export const toNumber = (val: any, fallback: number): number => {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

export const getRootFields = (data: any): string[] => {
  if (!data) return [];
  const sample = Array.isArray(data) ? data[0] : data;
  if (sample && typeof sample === 'object' && !Array.isArray(sample)) return Object.keys(sample);
  return [];
};

export const getChildFields = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) {
    const first = val[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) return Object.keys(first);
    return [];
  }
  if (typeof val === 'object') return Object.keys(val);
  return [];
};

export const getProjectedChildValue = (item: any, basePath: string, childKey: string) => {
  const sub = getNestedValue(item, basePath);
  if (Array.isArray(sub)) {
    const first = sub[0];
    if (first && typeof first === 'object') return first?.[childKey];
    try {
      return JSON.stringify(sub);
    } catch {
      return String(sub);
    }
  }
  if (sub && typeof sub === 'object') return sub?.[childKey];
  return undefined;
};

export const projectSelected = (data: any, rootSel: string[], childSel: string[], path: string) => {
  const makeRow = (src: any, idx: number) => {
    const row: any = { key: idx };
    rootSel.forEach((f) => {
      row[f] = getNestedValue(src, f);
    });
    childSel.forEach((cf) => {
      row[`${path}.${cf}`] = getProjectedChildValue(src, path, cf);
    });
    return row;
  };

  if (Array.isArray(data)) {
    return data.map((item, idx) => (item && typeof item === 'object' ? makeRow(item, idx) : { key: idx }));
  }
  if (data && typeof data === 'object') {
    return [makeRow(data, 0)];
  }
  return [];
};
