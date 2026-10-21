import type React from 'react';
import type { TableProps } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';

export const TABLE_CSS_PREFIX = 'wt-table';

export type ColumnPreferencesStorage = {
  getVisibleColumnKeys: (tableId: string) => string[] | null;
  setVisibleColumnKeys: (tableId: string, keys: string[]) => void;
  getColumnWidths: (tableId: string) => Record<string, number> | null;
  setColumnWidths: (tableId: string, widths: Record<string, number>) => void;
  clearAll?: () => void;
};

export type ResizableColumnsConfig = {
  minWidth?: number;
  persist?: boolean;
};

export type ColumnSettingsLabels = {
  showAll?: string;
  hideAll?: string;
  reset?: string;
  resetWithWidths?: string;
  popoverTitle?: string;
  triggerTooltip?: string;
};

export type ColumnVisibilityConfig = {
  ignoreKeys?: string[];
  minColumnsForSettings?: number;
};

export type TableLabels = {
  columnSettings?: ColumnSettingsLabels;
};

export type TableComponentProps<T extends object = object> = TableProps<T> & {
  id: string;
  toolbar?: React.ReactNode;
  /** Shows a refresh button in the toolbar row; `refreshing` spins its icon while data reloads. */
  onRefresh?: () => void;
  refreshing?: boolean;
  showTopDivider?: boolean;
  ignoreKeys?: string[];
  resizableColumns?: boolean | ResizableColumnsConfig;
  columnVisibility?: boolean | ColumnVisibilityConfig;
  columnPreferencesStorage?: ColumnPreferencesStorage;
  labels?: TableLabels;
  sorter?: SorterResult<T> | SorterResult<T>[] | null;
};
