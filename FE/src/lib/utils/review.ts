import { formatDay } from './horse';
import { reviewRows, serviceParts, shortDay } from './request';

import type { Tone } from '@/components/ui/tone';
import type {
  QuotationRef,
  QueuePosition,
  QueueRow,
  RequestReview,
  RequestStatus,
  ReviewCheck,
  TransportRequest,
} from '@/interfaces';

/** Waiting on the manager: the only statuses the checks and the decision apply to. */
export const inReview = (status: RequestStatus): boolean =>
  status === 'SUBMITTED' || status === 'UNDER_REVIEW';

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

/**
 * The queue's "Waiting for": review, the manager's approval of an accepted quotation, or the issue
 * of a re-quote the customer asked for after expiry (A4; only an expired request with a draft is listed).
 */
export const waitingFor = (status: RequestStatus): { tone: Tone; label: string } =>
  status === 'CUSTOMER_ACCEPTED'
    ? { tone: 'ok', label: 'Approval' }
    : status === 'EXPIRED'
      ? { tone: 'warn', label: 'Re-quote' }
      : { tone: 'info', label: 'Review' };

/** "Saigon Turf Club · 2 horses · road, shared load · departs 30 Oct 2026 ±3 d". */
export const reviewSummary = (r: TransportRequest & { club: string }): string => {
  const n = r.horses.length;
  // The line already runs on "·", so the service joins its words with a comma: "road, shared load".
  const parts = serviceParts(r.mode ?? 'ROAD', r.trailer, r.airClass);
  const service = `${parts.mode.toLowerCase()}${parts.detail ? `, ${parts.detail}` : ''}`;
  const departs = r.departureDate
    ? ` · departs ${formatDay(r.departureDate)}${r.dateFlexDays === 3 ? ' ±3 d' : ''}`
    : '';
  return `${r.club} · ${n} horse${n === 1 ? '' : 's'} · ${service}${departs}`;
};

/** What reviewRows reads, so a version sent before a field existed still renders. */
const BLANK: TransportRequest = {
  id: '',
  estimateLow: null,
  estimateHigh: null,
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
  rejectReason: null,
  cancelledAt: null,
  cancellationFeePct: null,
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

/**
 * What the review header describes: the latest version the customer sent, so a returned request's unsent
 * edits never show as if they were sent; the request itself when no version was kept.
 */
export const reviewSubject = (review: RequestReview): RequestReview['request'] => {
  const latest = review.revisions[review.revisions.length - 1];
  return latest ? { ...asSent(latest.payload), club: review.request.club } : review.request;
};

/**
 * The quotation button on the decision panel: start one while the request is in review, open the one
 * started whatever the request's status (the builder reads it in any status), else none.
 */
export const quotationAction = (
  status: RequestStatus,
  quotation: QuotationRef | null,
): 'start' | 'open' | null => {
  if (quotation) return 'open';
  return status === 'SUBMITTED' || status === 'UNDER_REVIEW' ? 'start' : null;
};

/**
 * The decision panel once the request is out of review. An expired request waits for its re-quote's issue
 * when the queue lists it, which it does only with the next version in draft (A4), so the page says what
 * the queue's "Re-quote" row said; a returned request waits for the customer; any other is not in review.
 */
export const restingPanel = (
  review: Pick<RequestReview, 'request' | 'queue' | 'quotation'>,
): { title: string; requote: string | null } => {
  const { request, queue, quotation } = review;
  if (request.status === 'EXPIRED' && queue && quotation?.status === 'DRAFT')
    return {
      title: 'Waiting for the re-quote',
      requote: `Issue version ${quotation.versionNo} of the quotation.`,
    };
  return {
    title: request.status === 'INFO_REQUIRED' ? 'Waiting for the customer' : 'Not in review',
    requote: null,
  };
};

/** A team member as a select option: "Nguyễn Thị Lan · 2 open jobs". */
export const teamOption = (m: { id: string; name: string; openJobs: number }) => ({
  value: m.id,
  label: `${m.name} · ${m.openJobs} open ${m.openJobs === 1 ? 'job' : 'jobs'}`,
});
