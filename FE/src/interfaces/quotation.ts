import type { TransportMode } from './job';
import type { MissingRate } from './rates';
import type { InsuranceOption, ServiceClass, TrailerType } from './request';

export const QuotationStatusEnum = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  EXPIRED: 'EXPIRED',
  SUPERSEDED: 'SUPERSEDED',
} as const;
export type QuotationStatus = (typeof QuotationStatusEnum)[keyof typeof QuotationStatusEnum];

export const LineCertaintyEnum = {
  FIXED: 'FIXED',
  ESTIMATED: 'ESTIMATED',
  OVERRIDDEN: 'OVERRIDDEN',
} as const;
export type LineCertainty = (typeof LineCertaintyEnum)[keyof typeof LineCertaintyEnum];

export const LineSourceEnum = { CATALOG: 'CATALOG', MANUAL: 'MANUAL' } as const;
export type LineSource = (typeof LineSourceEnum)[keyof typeof LineSourceEnum];

/** The review's pointer to its quotation, once started. */
export interface QuotationRef {
  code: string;
  versionNo: number;
  status: QuotationStatus;
}

export interface QuotationRequestFacts {
  id: string;
  code: string;
  club: string | null;
  fromCity: string;
  toCity: string;
  mode: TransportMode;
  trailer: TrailerType | null;
  /** The customer's own class; the draft may be priced with another. */
  requestedClass: ServiceClass | null;
  horseCount: number;
  departureDate: string | null;
  dateFlexDays: number;
  insurance: InsuranceOption | null;
  vetEscort: boolean;
}

/** How the horses fit the priced air class; refusal is null when they fit. */
export interface StallFit {
  positions: number;
  widthUsedIn: number;
  refusal: string | null;
  achievableClasses: ServiceClass[];
}

/** A quotation line; unitRate and amount are null on a "No rate" line. */
export interface QuoteLineRow {
  description: string;
  basisText: string;
  quantity: number;
  unitRate: number | null;
  amount: number | null;
  certainty: LineCertainty;
  estimateNote: string | null;
  source: LineSource;
}

export interface QuoteGroup {
  code: string;
  name: string;
  /** Null while a line in the group has no rate. */
  subtotal: number | null;
  lines: QuoteLineRow[];
}

export interface QuoteTotalRow {
  key: 'VOLUME_BREAK' | 'FUEL' | 'INSURANCE' | 'CONTINGENCY' | 'SERVICE_FEE';
  label: string;
  baseText: string;
  amount: number | null;
}

export interface QuoteTotals {
  pricedLines: number;
  subtotal: number | null;
  rows: QuoteTotalRow[];
  total: number | null;
}

export interface Readiness {
  ready: boolean;
  pricedLines: number;
  lineCount: number;
}

/** GET /staff/requests/{id}/quotation: the Quotation builder. */
export interface QuotationDraft {
  id: string;
  code: string;
  versionNo: number;
  status: QuotationStatus;
  pinnedVersion: { id: string; versionNo: number };
  latestPublishedVersionNo: number | null;
  request: QuotationRequestFacts;
  airClass: ServiceClass | null;
  fit: StallFit | null;
  groups: QuoteGroup[];
  totals: QuoteTotals;
  missing: MissingRate[];
  readiness: Readiness;
  validityDays: number | null;
  currency: string;
  catalogOwner: string | null;
  /** The request changed since the draft was priced: re-price before trusting it. */
  repriceNeeded: boolean;
}
