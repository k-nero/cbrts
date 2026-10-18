import React from 'react';
import type { TableProps } from 'antd';
import { Divider, Empty, Table as AntTable } from 'antd';

import ColumnResizeOverlay from './columnResize/ColumnResizeOverlay';
import ColumnSettingButton from './columnVisibility/ColumnSettingButton';
import { TABLE_PAGINATION_RESERVED_HEIGHT_PX } from './core/constants';
import { useApplyColumnWidths } from './hooks/useTableColumnLayoutEffects';
import { useTableEnhancements } from './hooks/useTableEnhancements';
import { TABLE_CSS_PREFIX } from './types';

import './columnResize/resizableHeader.css';

import { formatNumber } from '@/lib';

const ESTIMATED_TABLE_HEADER_HEIGHT_PX = 40;
const ESTIMATED_TABLE_ROW_HEIGHT_PX = 39;

/** Extend `scroll.y` when pagination hidden; drop `y` when few rows avoid empty gutter. */
const resolveScrollForPagination = (
  scroll: TableProps['scroll'] | undefined,
  paginationVisible: boolean,
  rowCount: number,
): TableProps['scroll'] | undefined => {
  if (!scroll) {
    return scroll;
  }

  let resolved = scroll;
  if (!paginationVisible && typeof scroll.y === 'number') {
    resolved = { ...scroll, y: scroll.y + TABLE_PAGINATION_RESERVED_HEIGHT_PX };
  }

  if (typeof resolved.y !== 'number') {
    return resolved;
  }

  const estimatedHeight =
    ESTIMATED_TABLE_HEADER_HEIGHT_PX + rowCount * ESTIMATED_TABLE_ROW_HEIGHT_PX;
  if (estimatedHeight <= resolved.y) {
    const { y: _scrollY, ...rest } = resolved;
    return Object.keys(rest).length > 0 ? rest : undefined;
  }

  return resolved;
};

// Sort headers flip between ascending and descending; the trailing 'ascend' makes antd's
// cycle wrap back instead of landing on "unsorted" (pages offer their own reset).
const TOGGLE_SORT_DIRECTIONS: NonNullable<TableProps['sortDirections']> = [
  'ascend',
  'descend',
  'ascend',
];

const Table = <T extends object = object>({
  id,
  columns = [],
  toolbar,
  showTopDivider = false,
  ignoreKeys,
  resizableColumns,
  columnVisibility,
  columnPreferencesStorage,
  pagination: paginationProp,
  onChange,
  scroll,
  className,
  rowSelection,
  labels,
  sorter,
  sortDirections = TOGGLE_SORT_DIRECTIONS,
  getPopupContainer: getPopupContainerProp,
  ...rest
}: import('./types').TableComponentProps<T>) => {
  const { dataSource } = rest;
  const dataSourceLength = Array.isArray(dataSource) ? dataSource.length : 0;

  const resolvedLabels = React.useMemo(
    () => ({
      ...labels,
      columnSettings: {
        showAll: 'Show all',
        hideAll: 'Hide all',
        reset: 'Reset to default',
        resetWithWidths: 'Reset columns and widths',
        popoverTitle: 'Columns',
        triggerTooltip: 'Show or hide columns',
        ...labels?.columnSettings,
      },
    }),
    [labels],
  );

  const pagination = React.useMemo((): typeof paginationProp => {
    if (paginationProp === false || paginationProp == null) {
      return paginationProp;
    }
    const defaultConfigs = {
      showSizeChanger: true,
      pageSizeOptions: [5, 10, 20, 50, 100],
      showTotal: (total: number) => `${formatNumber(total)} items`,
    };
    if (typeof paginationProp === 'object' && typeof paginationProp.showTotal === 'function') {
      return {
        ...defaultConfigs,
        ...paginationProp,
      };
    }
    return {
      ...defaultConfigs,
      ...paginationProp,
    };
  }, [paginationProp]);

  const {
    tableWrapperRef,
    visibility,
    resizableEnabled,
    columnResizeDrag,
    isResizing,
    preparedVisibleColumns,
    resolvedScroll,
    applyWidthsToDom,
    widthsVersion,
    visibleColumnFingerprint,
    showColumnSettings,
    handleResetColumnPreferences,
    wrapperClassName,
  } = useTableEnhancements({
    id,
    columns,
    className,
    scroll,
    rowSelection,
    ignoreKeys,
    resizableColumns,
    columnVisibility,
    columnPreferencesStorage,
  });

  const finalScroll = React.useMemo(
    () => resolveScrollForPagination(resolvedScroll, pagination !== false, dataSourceLength),
    [dataSourceLength, pagination, resolvedScroll],
  );

  const finalTableScroll = React.useMemo(() => {
    if (!rest.virtual) {
      return finalScroll;
    }

    if (typeof finalScroll?.y === 'number') {
      return finalScroll;
    }

    if (typeof resolvedScroll?.y === 'number') {
      return { ...(finalScroll ?? resolvedScroll), y: resolvedScroll.y };
    }

    return finalScroll;
  }, [finalScroll, resolvedScroll, rest.virtual]);

  const getPopupContainer = React.useCallback(
    (triggerNode: HTMLElement) =>
      getPopupContainerProp?.(triggerNode) ??
      tableWrapperRef.current ??
      triggerNode.parentElement ??
      document.body,
    [getPopupContainerProp, tableWrapperRef],
  );

  // Bridges the width-apply hook → overlay: the overlay publishes its measurement here,
  // and the hook calls it right after writing the column widths so the resize handles
  // re-measure in the same frame.
  const measureOverlayRef = React.useRef<() => void>(() => {});

  useApplyColumnWidths({
    resizableEnabled,
    isResizing,
    dataSourceLength,
    visibleColumnFingerprint,
    widthsVersion,
    tableRootRef: tableWrapperRef,
    applyWidthsToDom,
    onWidthsApplied: () => measureOverlayRef.current(),
  });

  const showToolbarRow = Boolean(toolbar) || showColumnSettings;

  // When a `sorter` state is supplied, control each sortable column's `sortOrder`
  // so the highlight tracks that state (and clears when it is reset). Columns that
  // set their own `sortOrder` are respected and left as-is.
  const activeSorter = Array.isArray(sorter) ? undefined : sorter;

  const finalColumns = React.useMemo(() => {
    return preparedVisibleColumns.map((col) => {
      const isStringTitle = typeof col.title === 'string';

      const columnDataIndex = 'dataIndex' in col ? col.dataIndex : undefined;
      const columnSorter = 'sorter' in col ? col.sorter : undefined;
      const columnSortOrder = 'sortOrder' in col ? col.sortOrder : undefined;

      const controlsSort =
        sorter !== undefined && columnSorter != null && columnSortOrder === undefined;
      const resolvedSortOrder = controlsSort
        ? activeSorter &&
          (activeSorter.columnKey === col.key || activeSorter.field === columnDataIndex)
          ? activeSorter.order
          : null
        : columnSortOrder;

      return {
        ...col,
        ellipsis: col.ellipsis ?? true,
        // antd treats any column carrying a `sortOrder` key as controlled — even when it
        // is undefined — and then can't advance past "unsorted". Only add the key when
        // the sort is actually controlled.
        ...(resolvedSortOrder !== undefined && { sortOrder: resolvedSortOrder }),

        title: isStringTitle ? (
          <div
            title={col.title as string}
            style={{
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%',
              wordBreak: 'keep-all',
            }}
          >
            {col.title as string}
          </div>
        ) : (
          col.title
        ),
      };
    });
  }, [preparedVisibleColumns, sorter, activeSorter]);

  const hasRealDataColumns = preparedVisibleColumns.some((col) => {
    const colKey = col.key;
    return colKey !== 'action';
  });

  return (
    <div
      ref={tableWrapperRef}
      className={wrapperClassName || undefined}
      style={{ position: 'relative' }}
    >
      {resizableEnabled && (
        <ColumnResizeOverlay
          tableRootRef={tableWrapperRef}
          measureRef={measureOverlayRef}
          drag={columnResizeDrag}
          ignoredColumnKeys={visibility.ignoreKeys}
        />
      )}
      {showToolbarRow && (
        <div className={`${TABLE_CSS_PREFIX}-toolbar`}>
          {toolbar ? <div className={`${TABLE_CSS_PREFIX}-toolbar-actions`}>{toolbar}</div> : null}
          {showColumnSettings ? (
            <ColumnSettingButton
              columns={columns}
              columnVisibility={visibility.columnVisibility}
              onToggle={visibility.toggleColumnVisibility}
              onReset={handleResetColumnPreferences}
              onShowAll={visibility.showAll}
              onHideAll={visibility.hideAll}
              ignoreKeys={visibility.ignoreKeys}
              resetIncludesColumnWidths={resizableEnabled}
              labels={resolvedLabels.columnSettings}
            />
          ) : null}
        </div>
      )}
      {showTopDivider && <Divider style={{ marginBottom: 8, marginTop: 8 }} />}
      <AntTable<T>
        {...rest}
        sortDirections={sortDirections}
        getPopupContainer={getPopupContainer}
        tableLayout={resizableEnabled ? 'fixed' : undefined}
        rowSelection={hasRealDataColumns ? rowSelection : undefined}
        columns={hasRealDataColumns ? finalColumns : []}
        scroll={finalTableScroll}
        onChange={onChange}
        pagination={pagination}
        locale={{
          emptyText: <Empty description="No data" />,
          ...rest.locale,
        }}
      />
    </div>
  );
};

export { default as TableToolbarRefreshButton } from './TableToolbarRefreshButton';
export default Table;

export type {
  ColumnPreferencesStorage,
  ColumnVisibilityConfig,
  ResizableColumnsConfig,
  TableComponentProps,
} from './types';
