import React from 'react';
import type { TableColumnsType } from 'antd';
import type { TableRowSelection } from 'antd/es/table/interface';

import { DEFAULT_COLUMN_RESIZE_MIN_WIDTH } from '../core/constants';
import type { ColumnPreferencesStorage, ResizableColumnsConfig } from '../types';
import { useColumnWidthState } from './useColumnWidthState';
import { useResizePointerDrag } from './useResizePointerDrag';

export type { ColumnResizeDrag } from './useResizePointerDrag';

export type UseColumnResizeOptions<T> = ResizableColumnsConfig & {
  enabled: boolean;
  id: string;
  columns: TableColumnsType<T>;
  visibleColumns: TableColumnsType<T>;
  visibleColumnKeys: string[];
  tableRootRef?: React.RefObject<HTMLElement | null>;
  storage?: ColumnPreferencesStorage;
  rowSelection?: TableRowSelection<T> | boolean;
  ignoredColumnKeys?: ReadonlySet<string>;
};

export const useColumnResize = <T extends object = object>({
  enabled,
  id,
  columns,
  visibleColumns,
  visibleColumnKeys,
  tableRootRef,
  storage,
  rowSelection,
  minWidth,
  persist,
  ignoredColumnKeys,
}: UseColumnResizeOptions<T>) => {
  const state = useColumnWidthState<T>({
    enabled,
    id,
    columns,
    minWidth,
    persist,
    storage,
    tableRootRef,
    visibleColumnKeys,
    ignoredColumnKeys,
    rowSelection,
  });

  const pointer = useResizePointerDrag({
    minWidth: minWidth ?? DEFAULT_COLUMN_RESIZE_MIN_WIDTH,
    visibleColumns,
    resize: state,
    tableRootRef,
    ignoredColumnKeys,
  });

  return React.useMemo(
    () => ({
      applyWidths: state.applyWidths,
      applyWidthsToDom: state.applyWidthsToDom,
      resetWidths: state.resetWidths,
      contentWidth: state.contentWidth,
      widthsVersion: state.widthsVersion,
      drag: pointer.drag,
      wrapperClassName: pointer.wrapperClassName,
    }),
    [
      state.applyWidths,
      state.applyWidthsToDom,
      state.resetWidths,
      state.contentWidth,
      state.widthsVersion,
      pointer.drag,
      pointer.wrapperClassName,
    ],
  );
};
