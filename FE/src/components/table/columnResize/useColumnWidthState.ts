import React from 'react';
import type { TableColumnsType } from 'antd';
import type { TableRowSelection } from 'antd/es/table/interface';

import { collectLeafColumnKeys, isTableIgnoredColumnKey } from '../core/columns';
import columnStorage from '../core/columnStorage';
import {
  DEFAULT_COLUMN_RESIZE_MIN_WIDTH,
  TABLE_COLUMN_PERSIST_DEBOUNCE_MS,
} from '../core/constants';
import type { ColumnPreferencesStorage, ResizableColumnsConfig } from '../types';
import {
  applyWidthsToColumns,
  buildColumnResizeFloorsMap,
  buildInitialWidthsMap,
  clampColumnWidth,
  getColumnResizeFloor,
  getSelectionColumnWidthIfPresent,
} from './columns';
import { applyColumnWidthsToDom } from './dom';

export type UseColumnWidthStateOptions<T> = ResizableColumnsConfig & {
  enabled: boolean;
  id: string;
  columns: TableColumnsType<T>;
  tableRootRef?: React.RefObject<HTMLElement | null>;
  storage?: ColumnPreferencesStorage;
  visibleColumnKeys: string[];
  ignoredColumnKeys?: ReadonlySet<string>;
  rowSelection?: TableRowSelection<T> | boolean;
};

/**
 * Column widths live in a ref (`widthsRef`), never React state — committing a resize
 * mutates the ref and writes straight to the DOM, so the table never re-renders or
 * reflows. State is used only for a `widthsVersion` counter that is bumped on the rare
 * structural events (hydrate from storage, reset) where the React column defs must be
 * recomputed so a freshly-built colgroup paints with the right widths.
 */
export const useColumnWidthState = <T extends object = object>({
  enabled,
  id,
  columns,
  minWidth = DEFAULT_COLUMN_RESIZE_MIN_WIDTH,
  persist: shouldPersist = false,
  storage = columnStorage,
  tableRootRef,
  visibleColumnKeys,
  ignoredColumnKeys = new Set(),
  rowSelection,
}: UseColumnWidthStateOptions<T>) => {
  const widthsRef = React.useRef<Record<string, number>>({});
  const [widthsVersion, setWidthsVersion] = React.useState(0);

  const persistTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingWidthsRef = React.useRef<Record<string, number> | null>(null);
  const lastHydratedKeyRef = React.useRef<string | null>(null);

  const columnKeys = React.useMemo(() => collectLeafColumnKeys(columns), [columns]);
  const initialWidths = React.useMemo(() => buildInitialWidthsMap(columns), [columns]);
  const resizeFloors = React.useMemo(
    () => buildColumnResizeFloorsMap(columns, minWidth),
    [columns, minWidth],
  );

  const selectionWidth = React.useMemo(
    () => getSelectionColumnWidthIfPresent(rowSelection),
    [rowSelection],
  );

  const getColumnWidth = React.useCallback(
    (columnKey: string): number => {
      const floor = getColumnResizeFloor(columnKey, resizeFloors, minWidth);
      if (!isTableIgnoredColumnKey(columnKey, ignoredColumnKeys)) {
        const override = widthsRef.current[columnKey];
        if (override != null) {
          return override;
        }
      }
      return clampColumnWidth(initialWidths[columnKey] ?? minWidth, floor);
    },
    [ignoredColumnKeys, initialWidths, minWidth, resizeFloors],
  );

  const persistResizeOverrides = React.useCallback(
    (next: Record<string, number>) => {
      if (!id || !shouldPersist) {
        return;
      }
      const delta: Record<string, number> = {};
      columnKeys.forEach((key) => {
        if (isTableIgnoredColumnKey(key, ignoredColumnKeys)) {
          return;
        }
        const w = next[key];
        if (w != null && w !== initialWidths[key]) {
          delta[key] = w;
        }
      });
      pendingWidthsRef.current = delta;
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
      }
      persistTimeoutRef.current = setTimeout(() => {
        persistTimeoutRef.current = null;
        const toWrite = pendingWidthsRef.current;
        if (toWrite) {
          storage.setColumnWidths(id, toWrite);
          pendingWidthsRef.current = null;
        }
      }, TABLE_COLUMN_PERSIST_DEBOUNCE_MS);
    },
    [columnKeys, id, ignoredColumnKeys, initialWidths, shouldPersist, storage],
  );

  const applyWidthsToDom = React.useCallback(() => {
    const root = tableRootRef?.current;
    if (!enabled || !root || visibleColumnKeys.length === 0) {
      return;
    }
    applyColumnWidthsToDom(
      root,
      visibleColumnKeys,
      ignoredColumnKeys,
      getColumnWidth,
      selectionWidth,
    );
  }, [enabled, getColumnWidth, ignoredColumnKeys, selectionWidth, tableRootRef, visibleColumnKeys]);

  /** Commit a single column's new width: mutate ref, persist, repaint via DOM. No re-render. */
  const resizeColumn = React.useCallback(
    (columnKey: string, width: number) => {
      if (isTableIgnoredColumnKey(columnKey, ignoredColumnKeys)) {
        return;
      }
      const floor = getColumnResizeFloor(columnKey, resizeFloors, minWidth);
      widthsRef.current = { ...widthsRef.current, [columnKey]: clampColumnWidth(width, floor) };
      persistResizeOverrides(widthsRef.current);
      applyWidthsToDom();
    },
    [applyWidthsToDom, ignoredColumnKeys, minWidth, persistResizeOverrides, resizeFloors],
  );

  const resetWidths = React.useCallback(() => {
    widthsRef.current = {};
    if (id && shouldPersist) {
      storage.setColumnWidths(id, {});
    }
    // Bump so the column defs recompute from the (now empty) ref → initial widths repaint.
    setWidthsVersion((v) => v + 1);
  }, [id, shouldPersist, storage]);

  const applyWidths = React.useCallback(
    (cols: TableColumnsType<T>) =>
      applyWidthsToColumns(cols, enabled, getColumnWidth, ignoredColumnKeys),
    // widthsVersion forces a fresh identity after hydrate/reset so memoized defs recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, getColumnWidth, ignoredColumnKeys, widthsVersion],
  );

  const contentWidth = React.useMemo(() => {
    // widthsVersion keeps this in sync after hydrate/reset; mid-session resizes update
    // the DOM table width directly (see applyColumnWidthsToDom), not this prop.
    void widthsVersion;
    const dataWidth = visibleColumnKeys.reduce((sum, key) => sum + getColumnWidth(key), 0);
    return dataWidth + selectionWidth;
  }, [getColumnWidth, selectionWidth, visibleColumnKeys, widthsVersion]);

  React.useEffect(
    () => () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = null;
        if (pendingWidthsRef.current && id && shouldPersist) {
          storage.setColumnWidths(id, pendingWidthsRef.current);
        }
      }
    },
    [id, shouldPersist, storage],
  );

  // Hydrate persisted widths into the ref once per (id, column-set), then bump the
  // version so the very first paint uses the stored widths. Runs in a layout effect so
  // the update flushes before the browser paints — no initial-width flash.
  React.useLayoutEffect(() => {
    if (!enabled || !id || columnKeys.length === 0) {
      lastHydratedKeyRef.current = null;
      return;
    }
    const fingerprint = columnKeys
      .slice()
      .sort((a, b) => a.localeCompare(b))
      .join(',');
    const cacheKey = `${id}|${fingerprint}`;
    if (lastHydratedKeyRef.current === cacheKey) {
      return;
    }
    lastHydratedKeyRef.current = cacheKey;

    const hydrated: Record<string, number> = {};
    if (shouldPersist) {
      try {
        const stored = storage.getColumnWidths(id);
        if (stored && typeof stored === 'object') {
          columnKeys.forEach((key) => {
            if (isTableIgnoredColumnKey(key, ignoredColumnKeys)) {
              return;
            }
            const w = stored[key];
            if (typeof w === 'number' && w > 0) {
              const floor = getColumnResizeFloor(key, resizeFloors, minWidth);
              hydrated[key] = clampColumnWidth(w, floor);
            }
          });
        }
      } catch {
        void 0;
      }
    }
    widthsRef.current = hydrated;
    setWidthsVersion((v) => v + 1);
  }, [columnKeys, enabled, id, ignoredColumnKeys, minWidth, resizeFloors, shouldPersist, storage]);

  return React.useMemo(
    () => ({
      getColumnWidth,
      resizeColumn,
      resetWidths,
      applyWidths,
      applyWidthsToDom,
      contentWidth,
      widthsVersion,
    }),
    [
      getColumnWidth,
      resizeColumn,
      resetWidths,
      applyWidths,
      applyWidthsToDom,
      contentWidth,
      widthsVersion,
    ],
  );
};
