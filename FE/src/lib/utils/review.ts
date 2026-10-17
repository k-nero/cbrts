import { formatDay } from './horse';
import { CLASS_WORDS, reviewRows, shortDay, TRAILER_WORDS } from './request';

import type { Tone } from '@/components/ui/tone';
import type { QueuePosition, QueueRow, ReviewCheck, TransportRequest } from '@/interfaces';

/** request_revisions.note holds 500 characters (spec §4.2). */
export const NOTE_MAX = 500;

/** "40 min", "9 h", "12 d": how long a request has waited, in whole units. */
export const ageWords = (since: string, now: Date): string => {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(since).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h`;
  return `${Math.floor(minutes / (24 * 60))} d`;
};

/** "Ho Chi Minh City → Bangkok", then "by road" or "by air". */
export const queueRoute = (row: QueueRow): { title: string; by: string } => ({
  title: `${row.fromCity ?? '—'} → ${row.toCity ?? '—'}`,
  by: row.mode === 'AIR' ? 'by air' : 'by road',
});

/** "30 Oct ±3 d", or "30 Oct" for fixed dates. */
export const departsWords = (date: string, flexDays: number): string =>
  `${shortDay(date)}${flexDays === 3 ? ' ±3 d' : ''}`;

/** "3 of 4". */
export const queueWords = (q: QueuePosition): string => `${q.position} of ${q.total}`;

/** "2 of 2 pass": only an OK check passes. */
export const checkTally = (checks: ReviewCheck[]): string =>
  `${checks.filter((c) => c.state === 'OK').length} of ${checks.length} pass`;

export const checkTone = (state: ReviewCheck['state']): Tone => (state === 'OK' ? 'ok' : 'bad');

/** "Saigon Turf Club · 2 horses · road, shared load · departs 30 Oct 2026 ±3 d". */
export const reviewSummary = (r: TransportRequest & { club: string }): string => {
  const n = r.horses.length;
  const service =
    r.mode === 'AIR'
      ? `air${r.airClass ? `, ${CLASS_WORDS[r.airClass]}` : ''}`
      : `road${r.trailer ? `, ${TRAILER_WORDS[r.trailer]}` : ''}`;
  const departs = r.departureDate
    ? ` · departs ${formatDay(r.departureDate)}${r.dateFlexDays === 3 ? ' ±3 d' : ''}`
    : '';
  return `${r.club} · ${n} horse${n === 1 ? '' : 's'} · ${service}${departs}`;
};

/** What reviewRows reads, so a version sent before a field existed still renders. */
const BLANK: TransportRequest = {
  id: '',
  code: null,
  status: 'SUBMITTED',
  createdAt: '',
  updatedAt: '',
  submittedAt: null,
  horses: [],
  origin: null,
  destination: null,
  departureDate: null,
  dateFlexDays: 0,
  arrivalMode: 'ANY_TIME',
  windowStart: null,
  windowEnd: null,
  specialInstructions: null,
  mode: null,
  trailer: null,
  airClass: null,
  insurance: null,
  vetEscort: false,
  route: null,
  leadTime: null,
  blockers: null,
  infoRequiredNote: null,
  revisions: [],
};

/** A stored payload as a whole request, missing fields filled with their blanks. */
export const asSent = (payload: Partial<TransportRequest>): TransportRequest => ({
  ...BLANK,
  ...payload,
  horses: payload.horses ?? [],
});

/** The review rows whose value differs from the previous version's, by label. */
export const changedRows = (
  previous: Partial<TransportRequest> | undefined,
  current: Partial<TransportRequest>,
): string[] => {
  if (!previous) return [];
  const before = new Map(reviewRows(asSent(previous)).map((r) => [r.label, r.value]));
  return reviewRows(asSent(current))
    .filter((r) => before.get(r.label) !== r.value)
    .map((r) => r.label);
};

/** The note as the server will count it: trimmed, at most 500 characters. */
export const noteState = (note: string): { length: number; ok: boolean; count: string } => {
  const length = note.trim().length;
  return { length, ok: length > 0 && length <= NOTE_MAX, count: `${length} / ${NOTE_MAX}` };
};
