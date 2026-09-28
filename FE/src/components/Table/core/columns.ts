import type { TableColumnGroupType, TableColumnsType, TableColumnType } from 'antd';

import { DEFAULT_TABLE_IGNORE_COLUMN_KEYS } from './constants';

type TableAnyColumn<T> = TableColumnGroupType<T> | TableColumnType<T>;
type ColumnPath = number[];

const fallbackColumnKey = (path: ColumnPath): string => `__col_${path.join('_')}`;
const hasChildren = <T>(col: TableAnyColumn<T>): col is TableColumnGroupType<T> =>
  Array.isArray((col as TableColumnGroupType<T>).children);

const dataIndexToKey = (dataIndex: unknown): string | undefined => {
  if (typeof dataIndex === 'string' || typeof dataIndex === 'number') {
    return String(dataIndex);
  }
  if (Array.isArray(dataIndex)) {
    const parts = dataIndex
      .map((part) => (typeof part === 'string' || typeof part === 'number' ? String(part) : ''))
      .filter(Boolean);
    return parts.length > 0 ? parts.join('.') : undefined;
  }
  return undefined;
};

export const getColumnKey = <T>(
  col: TableColumnGroupType<T> | TableColumnType<T>,
): string | undefined => {
  if ('key' in col && col.key) {
    return col.key as string;
  }

  if ('dataIndex' in col && col.dataIndex) {
    return dataIndexToKey(col.dataIndex);
  }

  return undefined;
};

export const resolveColumnKey = <T>(col: TableAnyColumn<T>, path: ColumnPath): string =>
  getColumnKey(col) ?? fallbackColumnKey(path);

export const collectLeafColumnKeys = <T>(columns: TableColumnsType<T>): string[] => {
  const keys: string[] = [];
  const visit = (cols: TableColumnsType<T>, path: ColumnPath) => {
    cols.forEach((col, index) => {
      const nextPath = [...path, index];
      if (hasChildren(col)) {
        visit(col.children, nextPath);
        return;
      }
      keys.push(resolveColumnKey(col, nextPath));
    });
  };
  visit(columns, []);
  return keys;
};

export const filterVisibleColumns = <T>(
  columns: TableColumnsType<T>,
  visibleKeys: Set<string>,
): TableColumnsType<T> => {
  const visit = (cols: TableColumnsType<T>, path: ColumnPath): TableColumnsType<T> =>
    cols.reduce<TableColumnsType<T>>((acc, col, index) => {
      const nextPath = [...path, index];
      if (hasChildren(col)) {
        const nextChildren = visit(col.children, nextPath);
        if (nextChildren.length > 0) {
          acc.push({ ...col, children: nextChildren });
        }
        return acc;
      }
      const key = resolveColumnKey(col, nextPath);
      if (visibleKeys.has(key)) {
        acc.push(col);
      }
      return acc;
    }, []);
  return visit(columns, []);
};

export const parseColumnWidth = (width: string | number | undefined): number | undefined => {
  if (typeof width === 'number' && width > 0) {
    return width;
  }
  if (typeof width === 'string') {
    const parsed = Number.parseInt(width, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
  return undefined;
};

export const getColumnInitialWidth = <T>(col: TableColumnType<T>): number | undefined =>
  parseColumnWidth(col.width);

export const resolveTableIgnoreKeys = (extra?: string[]): string[] => {
  const merged = new Set<string>([...DEFAULT_TABLE_IGNORE_COLUMN_KEYS, ...(extra ?? [])]);
  return Array.from(merged).filter(Boolean);
};

export const isTableIgnoredColumnKey = (
  key: string,
  ignoredKeys: ReadonlySet<string> | readonly string[],
): boolean => {
  if (ignoredKeys instanceof Set) {
    return ignoredKeys.has(key);
  }
  return (ignoredKeys as readonly string[]).includes(key);
};
