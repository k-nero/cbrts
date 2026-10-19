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

/**
 * A quotation line; unitRate and amount are null on a "No rate" line. amount is the override when there is
 * one; catalogAmount keeps what the catalog gave (US-Q-02). manual marks a line the manager added.
 */
export interface QuoteLineRow {
  id: string;
  /** The line's identity across re-prices and versions ("GROOM", "STALL", "MANUAL:…"). */
  lineKey: string | null;
  description: string;
  basisText: string;
  quantity: number;
  unitRate: number | null;
  amount: number | null;
  certainty: LineCertainty;
  estimateNote: string | null;
  source: LineSource;
  catalogAmount: number | null;
  overrideAmount: number | null;
  overrideReason: string | null;
  manual: boolean;
  manualReason: string | null;
}

export interface QuoteGroup {
  code: string;
  name: string;
  /** Null while a line in the group has no rate. */
  subtotal: number | null;
  lines: QuoteLineRow[];
}

export interface QuoteTotalRow {
  key: 'VOLUME_BREAK' | 'ARRIVAL_WINDOW' | 'FUEL' | 'INSURANCE' | 'CONTINGENCY' | 'SERVICE_FEE';
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
  /** What stops the draft being issued, in words; empty when ready (US-Q-04). */
  blockers: string[];
}

/** The deposit fixed at issue (US-Q-08). */
export interface Deposit {
  pct: number;
  amount: number;
}

/** One version of a request's quotation (US-Q-07). */
export interface QuotationVersion {
  versionNo: number;
  status: QuotationStatus;
  issuedAt: string | null;
  validUntil: string | null;
  total: number | null;
  supersededReason: string | null;
}

/** The version a revision replaces, for "Changed since": each keyed line's amount. */
export interface PreviousVersion {
  versionNo: number;
  total: number | null;
  amountsByKey: Record<string, number>;
}

export interface OverrideInput {
  amount: number;
  reason: string;
}

/** A line the manager adds to the draft (US-F1-05). */
export interface ManualLineInput {
  group: string;
  description: string;
  quantity: number;
  unitRate: number;
  certainty: 'FIXED' | 'ESTIMATED';
  estimateNote: string | null;
  reason: string;
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
  /** Null on an issued, expired or superseded version: it is a document, not a draft. */
  readiness: Readiness | null;
  validityDays: number | null;
  currency: string;
  catalogOwner: string | null;
  /** The request changed since the draft was priced: re-price before trusting it. */
  repriceNeeded: boolean;
  /** The overrides the last write could not carry ("Flight veterinarian: the line is no longer quoted"). */
  droppedOverrides: string[];
  issuedAt: string | null;
  validUntil: string | null;
  deposit: Deposit | null;
  /** Every version, newest first. */
  versions: QuotationVersion[];
  previous: PreviousVersion | null;
}
