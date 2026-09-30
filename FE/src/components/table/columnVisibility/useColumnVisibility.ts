import React from 'react';
import type { TableColumnsType } from 'antd';

import { collectLeafColumnKeys, filterVisibleColumns } from '../core/columns';
import columnStorage from '../core/columnStorage';
import { TABLE_COLUMN_PERSIST_DEBOUNCE_MS } from '../core/constants';
import type { ColumnPreferencesStorage } from '../types';

export type UseColumnVisibilityOptions = {
  ignoreKeys?: string[];
  storage?: ColumnPreferencesStorage;
};

export const useColumnVisibility = <T>(
  id: string,
  columns: TableColumnsType<T>,
  options?: UseColumnVisibilityOptions,
) => {
  const storage = options?.storage ?? columnStorage;
  const { ignoreKeys: rawIgnoreKeys = [] } = options ?? {};

  const [visibleKeys, setVisibleKeys] = React.useState<Set<string>>(
    () => new Set(collectLeafColumnKeys(columns)),
  );

  const lastHydratedKeyRef = React.useRef<string | null>(null);
  const persistTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingKeysRef = React.useRef<Set<string> | null>(null);

  const columnKeys = React.useMemo(() => collectLeafColumnKeys(columns), [columns]);

  const ignoreSet = React.useMemo(() => new Set(rawIgnoreKeys.filter(Boolean)), [rawIgnoreKeys]);

  const ignoreFingerprint = React.useMemo(
    () =>
      Array.from(ignoreSet)
        .sort((a, b) => a.localeCompare(b))
        .join(','),
    [ignoreSet],
  );

  const columnVisibility = React.useMemo(() => {
    const visibility: Record<string, boolean> = {};
    columnKeys.forEach((key) => {
      visibility[key] = visibleKeys.has(key);
    });
    return visibility;
  }, [columnKeys, visibleKeys]);

  const visibleColumns = React.useMemo(
    (): TableColumnsType<T> => filterVisibleColumns(columns, visibleKeys),
    [columns, visibleKeys],
  );

  const persist = React.useCallback(
    (keys: Set<string>) => {
      if (!id) {
        return;
      }
      pendingKeysRef.current = keys;
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
      }
      persistTimeoutRef.current = setTimeout(() => {
        persistTimeoutRef.current = null;
        const toWrite = pendingKeysRef.current;
        if (toWrite) {
          storage.setVisibleColumnKeys(id, Array.from(toWrite));
          pendingKeysRef.current = null;
        }
      }, TABLE_COLUMN_PERSIST_DEBOUNCE_MS);
    },
    [id, storage],
  );

  const toggleColumnVisibility = React.useCallback(
    (key: string) => {
      if (ignoreSet.has(key)) {
        return;
      }
      setVisibleKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        columnKeys.forEach((k) => {
          if (ignoreSet.has(k)) {
            next.add(k);
          }
        });
        persist(next);
        return next;
      });
    },
    [columnKeys, ignoreSet, persist],
  );

  const resetVisibility = React.useCallback(() => {
    const next = new Set(columnKeys);
    setVisibleKeys(next);
    persist(next);
  }, [columnKeys, persist]);

  const showAll = React.useCallback(() => {
    const next = new Set(columnKeys);
    setVisibleKeys(next);
    persist(next);
  }, [columnKeys, persist]);

  const hideAll = React.useCallback(() => {
    const next = new Set(columnKeys.filter((k) => ignoreSet.has(k)));
    setVisibleKeys(next);
    persist(next);
  }, [columnKeys, ignoreSet, persist]);

  React.useEffect(
    () => () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = null;
        if (pendingKeysRef.current && id) {
          storage.setVisibleColumnKeys(id, Array.from(pendingKeysRef.current));
        }
      }
    },
    [id, storage],
  );

  React.useEffect(() => {
    if (globalThis.window === undefined || !id || columnKeys.length === 0) {
      lastHydratedKeyRef.current = null;
      return undefined;
    }
    const fingerprint = columnKeys
      .slice()
      .sort((a, b) => a.localeCompare(b))
      .join(',');
    const cacheKey = `${id}|${fingerprint}|${ignoreFingerprint}`;
    if (lastHydratedKeyRef.current === cacheKey) {
      return undefined;
    }
    lastHydratedKeyRef.current = cacheKey;

    try {
      const stored = storage.getVisibleColumnKeys(id);
      const valid = stored?.filter((k) => columnKeys.includes(k)) ?? [];
      const hasStored = stored != null && Array.isArray(stored);
      const alwaysVisible = columnKeys.filter((k) => ignoreSet.has(k));
      const merged = hasStored ? new Set([...valid, ...alwaysVisible]) : new Set(columnKeys);
      setVisibleKeys(merged);
    } catch {
      setVisibleKeys(new Set(columnKeys));
    }

    return undefined;
  }, [columnKeys, id, ignoreFingerprint, ignoreSet, storage]);

  return {
    visibleColumns,
    columnVisibility,
    toggleColumnVisibility,
    resetVisibility,
    showAll,
    hideAll,
    ignoreKeys: ignoreSet,
  };
};
