import React from 'react';
import type { TableColumnGroupType, TableColumnsType } from 'antd';
import type { TableRowSelection } from 'antd/es/table/interface';

import { resolveResizableConfig, resolveScrollForResize } from '../columnResize/resizeLayout';
import { useColumnResize } from '../columnResize/useColumnResize';
import { useColumnVisibility } from '../columnVisibility';
import {
  collectLeafColumnKeys,
  resolveTableIgnoreKeys,
  TABLE_COLUMN_SETTINGS_MIN_COLUMNS,
} from '../core';
import type { TableComponentProps } from '../types';
import { TABLE_CSS_PREFIX } from '../types';

import EllipsisTooltip from '@/components/EllipsisTooltip';

/**
 * Wrap leaf columns that have no custom `render` so their raw string/number value
 * is shown through {@link EllipsisTooltip} — truncating with an ellipsis and revealing
 * the full text in a tooltip when clipped (e.g. after a column is resized narrower).
 * Columns with a custom `render` (buttons, tags, actions, etc.) are left untouched.
 */
const applyColumnEllipsis = <T extends object>(columns: TableColumnsType<T>): TableColumnsType<T> =>
  columns.map((col) => {
    if (Array.isArray((col as TableColumnGroupType<T>).children)) {
      const group = col as TableColumnGroupType<T>;
      return { ...group, children: applyColumnEllipsis(group.children) };
    }

    return {
      ...col,
      render: (value: unknown, record: T, index: number) => {
        let val = value;
        if (typeof col.render === 'function') {
          val = col.render(value, record, index);
        }
        if (typeof val === 'string' || typeof val === 'number') {
          return React.createElement(EllipsisTooltip, { text: String(val) });
        }
        return val as React.ReactNode;
      },
    };
  });

type UseTableEnhancementsOptions<T extends object> = {
  id: string;
  columns: TableColumnsType<T>;
  className?: string;
  scroll?: TableComponentProps<T>['scroll'];
  rowSelection?: TableRowSelection<T> | boolean;
  ignoreKeys?: string[];
  resizableColumns?: TableComponentProps<T>['resizableColumns'];
  columnVisibility?: TableComponentProps<T>['columnVisibility'];
  showColumnSettings?: boolean;
  columnPreferencesStorage?: TableComponentProps<T>['columnPreferencesStorage'];
};

export const useTableEnhancements = <T extends object>({
  id,
  columns,
  className,
  scroll,
  rowSelection,
  ignoreKeys,
  resizableColumns,
  columnVisibility,
  showColumnSettings: showColumnSettingsProp = true,
  columnPreferencesStorage,
}: UseTableEnhancementsOptions<T>) => {
  // Without the button nobody could bring back a column hidden earlier, so every column shows.
  const visibilityEnabled = columnVisibility !== false && showColumnSettingsProp;
  const visibilityIgnoreKeys = React.useMemo(() => {
    const extra = typeof columnVisibility === 'object' ? columnVisibility.ignoreKeys : ignoreKeys;
    return resolveTableIgnoreKeys(extra);
  }, [columnVisibility, ignoreKeys]);
  const { enabled: resizableEnabled, config: resizableConfig } =
    resolveResizableConfig(resizableColumns);

  const tableWrapperRef = React.useRef<HTMLDivElement>(null);

  const visibility = useColumnVisibility<T>(id, columns, {
    ignoreKeys: visibilityIgnoreKeys,
    storage: columnPreferencesStorage,
  });
  const shownColumns = visibilityEnabled ? visibility.visibleColumns : columns;

  const visibleColumnKeysForWidths = React.useMemo(
    () => collectLeafColumnKeys(shownColumns),
    [shownColumns],
  );

  const columnResize = useColumnResize<T>({
    enabled: resizableEnabled,
    id,
    columns,
    visibleColumns: shownColumns,
    visibleColumnKeys: visibleColumnKeysForWidths,
    tableRootRef: tableWrapperRef,
    storage: columnPreferencesStorage,
    rowSelection,
    ignoredColumnKeys: visibility.ignoreKeys,
    ...resizableConfig,
  });

  const preparedVisibleColumns = React.useMemo((): TableColumnsType<T> => {
    const base = resizableEnabled ? columnResize.applyWidths(shownColumns) : shownColumns;
    return applyColumnEllipsis(base);
  }, [columnResize, resizableEnabled, shownColumns]);

  const resolvedScroll = React.useMemo(
    () => resolveScrollForResize(scroll, resizableEnabled, columnResize.contentWidth),
    [columnResize.contentWidth, resizableEnabled, scroll],
  );

  const visibleColumnFingerprint = React.useMemo(
    () => visibleColumnKeysForWidths.join(','),
    [visibleColumnKeysForWidths],
  );

  const minColumnsForSettings = React.useMemo(() => {
    if (typeof columnVisibility === 'object' && columnVisibility.minColumnsForSettings != null) {
      return columnVisibility.minColumnsForSettings;
    }
    return TABLE_COLUMN_SETTINGS_MIN_COLUMNS;
  }, [columnVisibility]);

  const showColumnSettings = React.useMemo(
    () => visibilityEnabled && columns.length >= minColumnsForSettings,
    [visibilityEnabled, columns.length, minColumnsForSettings],
  );

  const wrapperClassName = React.useMemo(
    () =>
      [
        TABLE_CSS_PREFIX,
        resizableEnabled ? `${TABLE_CSS_PREFIX}-columns-resizable` : '',
        columnResize.wrapperClassName,
        className,
      ]
        .filter(Boolean)
        .join(' '),
    [className, columnResize.wrapperClassName, resizableEnabled],
  );

  const handleResetColumnPreferences = React.useCallback(() => {
    visibility.resetVisibility();
    if (resizableEnabled) {
      columnResize.resetWidths();
    }
  }, [columnResize, resizableEnabled, visibility]);

  const handleShowAllColumns = React.useCallback(() => {
    visibility.showAll();
    if (resizableEnabled) {
      columnResize.resetWidths();
    }
  }, [columnResize, resizableEnabled, visibility]);

  return {
    tableWrapperRef,
    visibility: {
      ...visibility,
      showAll: handleShowAllColumns,
    },
    resizableEnabled,
    columnResize,
    columnResizeDrag: columnResize.drag,
    isResizing: columnResize.drag.isResizing,
    preparedVisibleColumns,
    resolvedScroll,
    applyWidthsToDom: columnResize.applyWidthsToDom,
    widthsVersion: columnResize.widthsVersion,
    visibleColumnFingerprint,
    showColumnSettings,
    handleResetColumnPreferences,
    wrapperClassName,
  };
};
