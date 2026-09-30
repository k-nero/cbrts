import type { TableColumnsType, TableColumnType } from 'antd';
import type { TableRowSelection } from 'antd/es/table/interface';

import {
  getColumnInitialWidth,
  isTableIgnoredColumnKey,
  parseColumnWidth,
  resolveColumnKey,
} from '../core/columns';

type ColumnPath = number[];
type AnyColumn<T> = TableColumnType<T> & { children?: TableColumnsType<T> };

const hasChildren = <T>(col: AnyColumn<T>): boolean => Array.isArray(col.children);

/**
 * Extra width for `scroll.x` when the table has a selection (checkbox) column.
 * Not in `columns[]` and not resizable.
 */
export const getSelectionColumnWidthIfPresent = <T = unknown>(
  rowSelection?: TableRowSelection<T> | boolean,
): number => {
  if (!rowSelection || rowSelection === true) {
    return 0;
  }
  const { columnWidth } = rowSelection;
  if (typeof columnWidth === 'number') {
    return columnWidth;
  }
  if (typeof columnWidth === 'string') {
    return Number.parseInt(columnWidth, 10) || 40;
  }
  return 40;
};

export const buildInitialWidthsMap = <T>(columns: TableColumnsType<T>): Record<string, number> => {
  const initial: Record<string, number> = {};
  const visit = (cols: TableColumnsType<T>, path: ColumnPath) => {
    cols.forEach((col, index) => {
      const nextPath = [...path, index];
      const key = resolveColumnKey(col, nextPath);
      if (hasChildren(col as AnyColumn<T>)) {
        visit((col as AnyColumn<T>).children ?? [], nextPath);
        return;
      }
      const w = getColumnInitialWidth(col as TableColumnType<T>);
      if (w != null) {
        initial[key] = w;
      }
    });
  };
  visit(columns, []);
  return initial;
};

export const getColumnResizeFloorFromColumn = <T>(
  col: TableColumnType<T>,
  globalMinWidth: number,
): number => {
  const explicitMin = parseColumnWidth(col.width);
  if (explicitMin != null) {
    return explicitMin;
  }
  return globalMinWidth;
};

export const buildColumnResizeFloorsMap = <T>(
  columns: TableColumnsType<T>,
  globalMinWidth: number,
): Record<string, number> => {
  const floors: Record<string, number> = {};
  const visit = (cols: TableColumnsType<T>, path: ColumnPath) => {
    cols.forEach((col, index) => {
      const nextPath = [...path, index];
      const key = resolveColumnKey(col, nextPath);
      if (hasChildren(col as AnyColumn<T>)) {
        visit((col as AnyColumn<T>).children ?? [], nextPath);
        return;
      }
      floors[key] = getColumnResizeFloorFromColumn(col as TableColumnType<T>, globalMinWidth);
    });
  };
  visit(columns, []);
  return floors;
};

export const getColumnResizeFloor = (
  columnKey: string,
  resizeFloors: Record<string, number>,
  globalMinWidth: number,
): number => resizeFloors[columnKey] ?? globalMinWidth;

export const clampColumnWidth = (width: number, minWidth: number) =>
  Math.max(minWidth, Math.round(width));

const attachColumnResizeKey = <T>(
  col: TableColumnType<T>,
  columnKey: string,
): TableColumnType<T> => {
  const existingOnHeaderCell = col.onHeaderCell;
  const existingOnCell = col.onCell;

  return {
    ...col,
    onHeaderCell: (column) => {
      const existing =
        typeof existingOnHeaderCell === 'function'
          ? existingOnHeaderCell(column)
          : (existingOnHeaderCell ?? {});

      return { ...existing, 'data-column-key': columnKey };
    },
    onCell: (record, rowIndex) => {
      const existing =
        typeof existingOnCell === 'function'
          ? existingOnCell(record, rowIndex)
          : (existingOnCell ?? {});

      return { ...existing, 'data-column-key': columnKey };
    },
  };
};

/**
 * Stamps each leaf column's design-hint `width`/`minWidth` (from {@link getColumnWidth})
 * so Ant's first paint of a freshly-built colgroup is correct and siblings don't
 * redistribute. The authoritative width afterwards lives in the resize state's ref and
 * is written straight to the DOM — see {@link applyColumnWidthsToDom}. Always attaches
 * `data-column-key` so the overlay and DOM writer can find each cell.
 */
export const applyWidthsToColumns = <T>(
  cols: TableColumnsType<T>,
  enabled: boolean,
  getColumnWidth: (columnKey: string) => number,
  ignoredKeys: ReadonlySet<string> = new Set(),
): TableColumnsType<T> =>
  cols.map((col, index) => {
    if (!enabled) {
      return col;
    }

    const visit = (node: AnyColumn<T>, path: ColumnPath): AnyColumn<T> => {
      const key = resolveColumnKey(node, path);
      if (hasChildren(node)) {
        return {
          ...node,
          children: (node.children ?? []).map((child, childIndex) =>
            visit(child as AnyColumn<T>, [...path, childIndex]),
          ),
        };
      }

      if (isTableIgnoredColumnKey(key, ignoredKeys)) {
        return attachColumnResizeKey(node, key);
      }

      const width = getColumnWidth(key);
      return attachColumnResizeKey({ ...node, width, minWidth: width }, key);
    };

    return visit(col, [index]);
  }) as TableColumnsType<T>;
