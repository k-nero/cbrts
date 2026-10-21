import type { TransportMode } from './job';
import type { TransportRequest } from './request';

/** One row of the logistics manager's review queue (US-F1-03, GET /staff/requests). */
export interface QueueRow {
  id: string;
  code: string;
  club: string;
  fromCity: string | null;
  toCity: string | null;
  mode: TransportMode | null;
  horseCount: number;
  /** YYYY-MM-DD. */
  departureDate: string | null;
  dateFlexDays: number;
  /** When the request entered the queue: its latest version's submission. */
  waitingSince: string;
  /** 2 or more: it came back after a return for information. */
  revisionNo: number;
}

/** A feasibility check, worked out by the server, in its own words (spec §4.4). */
export interface ReviewCheck {
  key: 'ROUTE_SERVED' | 'LEAD_TIME';
  state: 'OK' | 'BAD';
  word: string;
  evidence: string;
  sub: string | null;
}

/** One submitted version as the manager sees it: the payload is the request as it was sent. */
export interface ReviewRevision {
  revisionNo: number;
  submittedAt: string;
  note: string | null;
  returnedAt: string | null;
  payload: Partial<TransportRequest>;
}

export interface HistoryEntry {
  occurredAt: string;
  summary: string;
  actorLabel: string;
}

/** "3 of 4", oldest first, with the neighbours to open next. */
export interface QueuePosition {
  position: number;
  total: number;
  previousId: string | null;
  nextId: string | null;
}

/** The Request review page (GET /staff/requests/{id}). */
export interface RequestReview {
  request: TransportRequest & { club: string };
  checks: ReviewCheck[];
  revisions: ReviewRevision[];
  history: HistoryEntry[];
  queue: QueuePosition | null;
}
