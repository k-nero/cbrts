import type { ColumnPreferencesStorage } from '../types';

const visibilityStorageKey = 'table_columns';
const widthsStorageKey = 'table_column_widths';
const sessionStorageKey = 'table_columns_id';
const broadcastChannelName = 'table_columns_sync';
const RequestTableColumnsId = 'request_table_columns_id';
const RespondTableColumnsId = 'respond_table_columns_id';
const syncRequestTimeoutMs = 800;

let storageReady = false;

const createTableColumnsId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

const getSessionStorage = (): Storage | null => {
  if (globalThis.window === undefined) {
    return null;
  }
  return globalThis.window.sessionStorage;
};

const getLocalStorage = (): Storage | null => {
  if (globalThis.window === undefined) {
    return null;
  }
  return globalThis.window.localStorage;
};

const getTableColumnsId = (): string | null => {
  const storage = getSessionStorage();
  return storage ? storage.getItem(sessionStorageKey) : null;
};

const setTableColumnsId = (id: string): void => {
  getSessionStorage()?.setItem(sessionStorageKey, id);
};

const clearStoredTablePrefs = (): void => {
  try {
    const storage = getLocalStorage();
    storage?.removeItem(visibilityStorageKey);
    storage?.removeItem(widthsStorageKey);
  } catch {
    return;
  }
};

const ensureTableColumnsId = (): void => {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  if (storage.getItem(sessionStorageKey)) {
    return;
  }

  try {
    const channel = new BroadcastChannel(broadcastChannelName);
    let resolved = false;

    const applyTableColumnsId = (id: string) => {
      if (resolved) {
        return;
      }
      resolved = true;
      storage.setItem(sessionStorageKey, id);
      channel.close();
    };

    channel.onmessage = (e: MessageEvent<{ type: string; id?: string }>) => {
      if (e.data?.type === RespondTableColumnsId && e.data.id) {
        applyTableColumnsId(e.data.id);
      }
    };

    channel.postMessage({ type: RequestTableColumnsId });

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        applyTableColumnsId(createTableColumnsId());
        clearStoredTablePrefs();
      }
    }, syncRequestTimeoutMs);

    const originalClose = channel.close.bind(channel);
    channel.close = () => {
      clearTimeout(timeoutId);
      originalClose();
    };
  } catch {
    setTableColumnsId(createTableColumnsId());
    clearStoredTablePrefs();
  }
};

const startTableColumnsIdResponder = (): void => {
  try {
    const channel = new BroadcastChannel(broadcastChannelName);
    channel.onmessage = (e: MessageEvent<{ type: string }>) => {
      if (e.data?.type !== RequestTableColumnsId) {
        return;
      }
      const id = getTableColumnsId();
      if (id) {
        channel.postMessage({ type: RespondTableColumnsId, id });
      }
    };
  } catch {
    return;
  }
};

const ensureStorageReady = (): void => {
  if (storageReady || globalThis.window === undefined) {
    return;
  }
  storageReady = true;
  ensureTableColumnsId();
  startTableColumnsIdResponder();
};

type StoredPayload<T> = { id: string; data: T };

const readStoredData = <T>(localStorageKey: string): T | null => {
  ensureStorageReady();
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }
  const id = getTableColumnsId();
  if (!id) {
    return null;
  }
  try {
    const raw = storage.getItem(localStorageKey);
    if (raw == null) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    const stored = parsed as StoredPayload<T>;
    if (typeof stored.id !== 'string' || stored.id !== id) {
      return null;
    }
    if (!stored.data || typeof stored.data !== 'object' || Array.isArray(stored.data)) {
      return null;
    }
    return stored.data;
  } catch {
    return null;
  }
};

const writeStoredData = <T>(localStorageKey: string, data: T): void => {
  ensureStorageReady();
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }
  const id = getTableColumnsId();
  if (!id) {
    return;
  }
  try {
    storage.setItem(localStorageKey, JSON.stringify({ id, data } satisfies StoredPayload<T>));
  } catch {
    return;
  }
};

type VisibilityData = Record<string, string[]>;
type WidthsData = Record<string, Record<string, number>>;

const buildStorage = (): ColumnPreferencesStorage => ({
  getVisibleColumnKeys: (tableId: string) => {
    const data = readStoredData<VisibilityData>(visibilityStorageKey);
    if (!data?.[tableId]) {
      return null;
    }
    const value = data[tableId];
    return Array.isArray(value) ? value : null;
  },
  setVisibleColumnKeys: (tableId: string, keys: string[]) => {
    const existing = readStoredData<VisibilityData>(visibilityStorageKey) ?? {};
    writeStoredData(visibilityStorageKey, { ...existing, [tableId]: keys });
  },
  getColumnWidths: (tableId: string) => {
    const data = readStoredData<WidthsData>(widthsStorageKey);
    if (!data?.[tableId]) {
      return null;
    }
    const value = data[tableId];
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  },
  setColumnWidths: (tableId: string, widths: Record<string, number>) => {
    const existing = readStoredData<WidthsData>(widthsStorageKey) ?? {};
    writeStoredData(widthsStorageKey, { ...existing, [tableId]: widths });
  },
  clearAll: clearStoredTablePrefs,
});

export const columnStorage = buildStorage();

export default columnStorage;
