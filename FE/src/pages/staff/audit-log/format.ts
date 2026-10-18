import {
  AUDIT_CHANNEL_LABEL,
  type AuditEntry,
  type AuditState,
  ROLE_LABEL,
  type RoleName,
} from '@/interfaces';
import { formatTime, ict } from '@/lib';

/** "DOCUMENT_REJECTED" → "Document rejected" (the Action filter's option labels). */
export const actionLabel = (code: string) => {
  const words = code.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** "Transport specialist"; entries no account made read "Automatic". */
export const roleLabel = (role: string | null) => {
  if (!role || role === 'SYSTEM') return 'Automatic';
  return ROLE_LABEL[role as RoleName] ?? actionLabel(role);
};

/** "Web", or "Cab tablet" with the time the tablet recorded it (it saves offline). */
export const fromLabel = (entry: AuditEntry) => AUDIT_CHANNEL_LABEL[entry.channel] ?? entry.channel;

export const recordedLabel = (entry: AuditEntry) =>
  entry.deviceRecordedAt ? `Recorded ${formatTime(entry.deviceRecordedAt)}` : null;

/** "28 Sep 2026 · 10:22". */
export const stampLabel = (iso: string) => ict(iso).format('D MMM YYYY · HH:mm');

/** "routeStopId" → "Route stop id". */
const fieldLabel = (key: string) => {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const valueLabel = (value: unknown) => {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
};

const asObject = (state: AuditState): Record<string, unknown> | null => {
  if (state === null) return null;
  return Array.isArray(state) ? { value: state } : state;
};

export interface ChangeRow {
  label: string;
  before: string;
  after: string;
}

/** One row per field in either document, before → after; fields that didn't change are left out. */
export const changeRows = (entry: AuditEntry): ChangeRow[] => {
  const before = asObject(entry.before) ?? {};
  const after = asObject(entry.after) ?? {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return keys
    .map((key) => ({
      label: fieldLabel(key),
      before: valueLabel(before[key]),
      after: valueLabel(after[key]),
    }))
    .filter((row) => row.before !== row.after);
};
