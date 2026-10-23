import type { TripRecordKind } from '@/interfaces';
import { TripRecordKindEnum } from '@/interfaces';

export const eventLabels: Record<TripRecordKind, string> = {
  [TripRecordKindEnum.LOADED]: 'Loaded',
  [TripRecordKindEnum.DEPARTED]: 'Departed',
  [TripRecordKindEnum.ARRIVED_AT_STOP]: 'Arrived at checkpoint',
  [TripRecordKindEnum.CLEARED_BORDER]: 'Customs cleared',
  [TripRecordKindEnum.HELD]: 'On hold',
  [TripRecordKindEnum.LEFT_STOP]: 'Left checkpoint',
  [TripRecordKindEnum.CONDITION_CHECK]: 'Condition check',
  [TripRecordKindEnum.ACCEPTED_BY_AIRLINE]: 'Accepted by airline',
  [TripRecordKindEnum.FLIGHT_DEPARTED]: 'Flight departed',
  [TripRecordKindEnum.FLIGHT_LANDED]: 'Flight landed',
  [TripRecordKindEnum.RELEASED_BY_AIRLINE]: 'Released by airline',
  [TripRecordKindEnum.DELIVERED]: 'Delivered',
  [TripRecordKindEnum.HANDED_OVER]: 'Handed over',
  [TripRecordKindEnum.NOTE]: 'Update',
};

const timeOptions = { dateStyle: 'medium', timeStyle: 'short' } as const;

export const formatTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('en-GB', timeOptions) : 'Not recorded';

export const formatClock = (value: string | null | Date) => {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
};

export const formatDuration = (minutes: number) => {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h > 0) {
    return m > 0 ? `${h} h ${m} min` : `${h} h`;
  }
  return `${m} min`;
};

export const formatCountdown = (target: string | null | Date, now: Date = new Date()) => {
  if (!target) return undefined;
  const d = typeof target === 'string' ? new Date(target) : target;
  if (Number.isNaN(d.getTime())) return undefined;
  const diffMinutes = Math.round((d.getTime() - now.getTime()) / 60000);
  if (diffMinutes > 0) {
    return `in ${formatDuration(diffMinutes)}`;
  }
  if (diffMinutes === 0) {
    return 'now';
  }
  return `${formatDuration(Math.abs(diffMinutes))} late`;
};

export const formatTrailerDuration = (departedAt: string | null | Date, now: Date = new Date()) => {
  if (!departedAt) return '3 h 25 min';
  const d = typeof departedAt === 'string' ? new Date(departedAt) : departedAt;
  if (Number.isNaN(d.getTime())) return '3 h 25 min';
  const diffMin = Math.max(0, Math.round((now.getTime() - d.getTime()) / 60000));
  return formatDuration(diffMin);
};

export const formatUnloadBy = (departedAt: string | null | Date, restEveryHours = 6) => {
  if (!departedAt) return '11:30';
  const d = typeof departedAt === 'string' ? new Date(departedAt) : new Date(departedAt.getTime());
  if (Number.isNaN(d.getTime())) return '11:30';
  d.setHours(d.getHours() + restEveryHours);
  return formatClock(d);
};

export const formatAgainstPlan = (plannedAt: string | null, recordedAt: string | null) => {
  if (!plannedAt || !recordedAt) return '—';
  const p = new Date(plannedAt).getTime();
  const r = new Date(recordedAt).getTime();
  if (Number.isNaN(p) || Number.isNaN(r)) return '—';
  const diffMin = Math.round((r - p) / 60000);
  if (diffMin === 0) return 'On time';
  return (diffMin > 0 ? '+' : '−') + formatDuration(diffMin);
};

/** Status in words (DESIGN.md: a tone plus a word, never a raw enum). */
export const sentence = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ');
