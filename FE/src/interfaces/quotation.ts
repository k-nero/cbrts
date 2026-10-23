import type { TransportMode } from './job';
import type { MissingRate } from './rates';
import type { InsuranceOption, RequestStatus, ServiceClass, TrailerType } from './request';

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

/* ---------- the customer's issued quotation (spec §6.1) ---------- */

/** A horse as quoted; the coat draws its swatch on the quoted pass. */
export interface QuotedHorse {
  id: string;
  name: string;
  sex: string;
  sizeClass: string | null;
  coat: string | null;
}

/** A line as the customer reads it: amount is the override when there is one. */
export interface CustomerQuoteLine {
  description: string;
  basisText: string | null;
  quantity: number;
  unitRate: number | null;
  amount: number | null;
  certainty: LineCertainty;
  estimateNote: string | null;
  overridden: boolean;
  catalogAmount: number | null;
  overrideReason: string | null;
  manual: boolean;
  manualReason: string | null;
}

export interface CustomerQuoteGroup {
  code: string;
  name: string;
  subtotal: number | null;
  lines: CustomerQuoteLine[];
}

export interface CancellationBand {
  minDays: number;
  maxDays: number | null;
  pct: number;
  current: boolean;
}

/** GET /customer/requests/{id}/quotation: the latest issued version, as a document. */
export interface CustomerQuotation {
  code: string;
  versionNo: number;
  status: QuotationStatus;
  /** Where the request stands; a cancelled request can't be answered whatever this version's status. */
  requestStatus: RequestStatus;
  issuedAt: string | null;
  validUntil: string | null;
  /** When the club accepted this version (US-F1-06). */
  acceptedAt: string | null;
  declinedAt: string | null;
  /** When the club cancelled the request, and the fee band applied then (BR-F1-07). */
  cancelledAt: string | null;
  cancellationFeePct: number | null;
  currency: string;
  pinnedVersionNo: number;
  request: {
    id: string;
    code: string;
    fromCity: string;
    toCity: string;
    mode: TransportMode;
    trailer: TrailerType | null;
    airClass: ServiceClass | null;
    horses: QuotedHorse[];
    departureDate: string | null;
    dateFlexDays: number;
    arrivalMode: 'ANY_TIME' | 'WINDOW' | null;
    windowStart: string | null;
    windowEnd: string | null;
    insurance: InsuranceOption | null;
    vetEscort: boolean;
  };
  groups: CustomerQuoteGroup[];
  /** How the air stall was sized, under group C; null on road. */
  stallNote: string | null;
  totals: { subtotal: number | null; rows: QuoteTotalRow[]; total: number | null };
  /** The range kept at submission against this total; null when none was kept. */
  estimate: { low: number; high: number; inside: boolean } | null;
  deposit: Deposit | null;
  cancellation: { daysToDeparture: number; bands: CancellationBand[] };
  latePenalty: { pctPerHour: number; capPct: number } | null;
  preparedBy: { name: string; role: string } | null;
  /** Every issued version, newest first. */
  versions: {
    versionNo: number;
    status: QuotationStatus;
    issuedAt: string | null;
    validUntil: string | null;
    supersededReason: string | null;
  }[];
}

/** The request's latest issued quotation, on the request and its list row. */
export interface QuotationIssuedRef {
  code: string;
  versionNo: number;
  status: QuotationStatus;
  validUntil: string | null;
}
