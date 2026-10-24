import type { IncidentSummary } from './incident';
import type { JobSummary } from './job';
import type { QueueRow } from './staffRequest';

/** An issued quotation waiting for the customer, soonest to expire first (US-R-01). */
export interface QuoteOut {
  requestId: string;
  requestCode: string | null;
  club: string;
  quotationCode: string;
  versionNo: number;
  total: number;
  currency: string;
  validUntil: string;
}

/** The logistics manager's Overview (US-R-01, GET /staff/overview). */
export interface Overview {
  asOf: string;
  awaitingReview: number;
  reviewQueue: QueueRow[];
  quotesOut: number;
  nextToExpire: QuoteOut | null;
  jobsBlocked: number;
  clearanceAtRisk: JobSummary[];
  incidentsOpen: number;
  newestIncident: IncidentSummary | null;
  departingThisWeek: number;
  nextDeparture: JobSummary | null;
  /** Of the jobs delivered in the last 30 days, the share on time (null with none), and how many were late. */
  onTimeRate: number | null;
  deliveredLast30Days: number;
  lateLast30Days: number;
}
