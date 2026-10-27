import type { HorseSex } from './horse';
import type { QuotationIssuedRef } from './quotation';
import type { TransportMode } from './job';
import type { StallType } from './vehicle';

export const RequestStatusEnum = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  INFO_REQUIRED: 'INFO_REQUIRED',
  REJECTED: 'REJECTED',
  QUOTED: 'QUOTED',
  CUSTOMER_ACCEPTED: 'CUSTOMER_ACCEPTED',
  EXPIRED: 'EXPIRED',
  APPROVED: 'APPROVED',
  CANCELLED: 'CANCELLED',
} as const;
export type RequestStatus = (typeof RequestStatusEnum)[keyof typeof RequestStatusEnum];

export const ArrivalModeEnum = { ANY_TIME: 'ANY_TIME', WINDOW: 'WINDOW' } as const;
export type ArrivalMode = (typeof ArrivalModeEnum)[keyof typeof ArrivalModeEnum];

export const TrailerTypeEnum = { SHARED: 'SHARED', PRIVATE: 'PRIVATE' } as const;
export type TrailerType = (typeof TrailerTypeEnum)[keyof typeof TrailerTypeEnum];

export const ServiceClassEnum = {
  ECONOMY: 'ECONOMY',
  BUSINESS: 'BUSINESS',
  FIRST: 'FIRST',
} as const;
export type ServiceClass = (typeof ServiceClassEnum)[keyof typeof ServiceClassEnum];

export const InsuranceOptionEnum = {
  OWN_POLICY: 'OWN_POLICY',
  EQUIFREIGHT: 'EQUIFREIGHT',
} as const;
export type InsuranceOption = (typeof InsuranceOptionEnum)[keyof typeof InsuranceOptionEnum];

/** A pickup or delivery point (GET /customer/places). Welfare stops are left out. */
export interface Place {
  id: string;
  name: string;
  kind: string;
  city: string;
  countryCode: string;
  countryName: string;
}

/** One end of a request: a catalog place, or the city the customer typed (`text`). */
export interface Endpoint {
  placeId: string | null;
  name: string | null;
  kind: string | null;
  city: string | null;
  countryCode: string | null;
  text: string | null;
}

export interface Crossing {
  name: string;
  fromCountry: string;
  toCountry: string;
}

/** A domestic road leg to or from a hub (US-F1-09), read in the direction of travel: "Da Nang → Ho Chi Minh City". */
export interface HubLeg {
  corridorId: string;
  code: string;
  fromCity: string;
  toCity: string;
  distanceKm: number | null;
}

/**
 * A local road run within one city, between the stable and the airport's cargo terminal, before or after a flight
 * (US-F3-22): "Đại Nam Racecourse → TCS cargo terminal, Tân Sơn Nhất (SGN)".
 */
export interface TerminalRun {
  corridorId: string;
  code: string;
  city: string;
  fromPlace: string;
  toPlace: string;
  distanceKm: number | null;
}

/**
 * A corridor we run, read in the direction of travel (GET /customer/routes). Without a destination
 * (the alternatives on a route we don't run) the countries, crossBorder and lead time are null.
 */
export interface Route {
  corridorId: string;
  code: string;
  mode: TransportMode;
  fromCity: string;
  toCity: string;
  distanceKm: number | null;
  crossings: Crossing[];
  countries: string[] | null;
  crossBorder: boolean | null;
  leadTimeDays: number | null;
  /** YYYY-MM-DD, with fixed dates. */
  earliestDeparture: string | null;
  /** How far flexible dates can move on this route, 0 to 7 days (#115); 0 runs on fixed dates only. */
  dateFlexDays: number;
  /** The road leg from the origin's city to the hub this corridor leaves from (US-F1-09); null when none. */
  firstLeg?: HubLeg | null;
  /** The road leg from the hub this corridor arrives in to the destination's city; null when none. */
  lastLeg?: HubLeg | null;
  /** Before a flight from a stable, the local run to the cargo terminal; null when none. */
  toTerminal?: TerminalRun | null;
  /** After a flight that lands in the stable's city, the local run from the cargo terminal; null when none. */
  fromTerminal?: TerminalRun | null;
}

export interface LeadTime {
  requiredDays: number;
  /** YYYY-MM-DD. */
  earliestDeparture: string;
  daysBeforeDeparture: number;
  met: boolean;
}

/** One thing that stops a draft from being submitted: a stable code, the field it is about, and the sentence. */
export interface Blocker {
  code: string;
  field: string;
  message: string;
}

/** A horse on a request: the snapshot that prices it, and the profile fields it still lacks. */
export interface RequestHorse {
  horseId: string;
  name: string;
  sex: HorseSex;
  sizeClassCode: string | null;
  requiredStall: StallType;
  declaredValue: number | null;
  withFoal: boolean;
  archived: boolean;
  /** passportNo, microchip, dateOfBirth, heightHh, weightKg. */
  missing: string[];
}

/** One line of a request's history, from the audit log (BR-F1-08). */
export interface HistoryEntry {
  occurredAt: string;
  summary: string;
  actorLabel: string;
}

/** What happens next on a request, and who does it (US-F1-08). */
export interface NextStep {
  action: string;
  /** "You", "Vũ Hải Yến, logistics manager", or "A logistics manager" before one picks it up. */
  owner: string;
  /** The customer owes this step. */
  yours: boolean;
  /** YYYY-MM-DD; null when the step has no deadline. */
  due: string | null;
}

/** A transport request (GET /customer/requests/{id}); `leadTime` and `blockers` only for a draft. */
export interface TransportRequest {
  id: string;
  /** The range shown at the latest submission (US-Q-05); null for a draft or when there was none. */
  estimateLow: number | null;
  estimateHigh: number | null;
  /** The latest issued quotation, on the customer's read; null until one is issued. */
  quotation?: QuotationIssuedRef | null;
  /** Every status change, newest first, on the customer's read (US-F1-08). */
  history?: HistoryEntry[];
  /** What happens next, on the customer's read; null when nothing more happens. */
  nextStep?: NextStep | null;
  /** Null until submitted. */
  code: string | null;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  horses: RequestHorse[];
  origin: Endpoint | null;
  destination: Endpoint | null;
  /** YYYY-MM-DD. */
  departureDate: string | null;
  dateFlexDays: number;
  arrivalMode: ArrivalMode | null;
  windowStart: string | null;
  windowEnd: string | null;
  specialInstructions: string | null;
  mode: TransportMode | null;
  trailer: TrailerType | null;
  airClass: ServiceClass | null;
  insurance: InsuranceOption | null;
  vetEscort: boolean;
  route: Route | null;
  leadTime: LeadTime | null;
  blockers: Blocker[] | null;
  /** The logistics manager's note while the request is INFO_REQUIRED (US-F1-04). */
  infoRequiredNote: string | null;
  /** Why the logistics manager rejected the request (BR-F1-04). */
  rejectReason: string | null;
  /** When the club cancelled the request, and the fee band applied then (BR-F1-07). */
  cancelledAt: string | null;
  cancellationFeePct: number | null;
  /** Every submitted version, oldest first; empty for a draft. */
  revisions: RevisionSummary[];
}

/** One submitted version of a request; `returnedAt` is set when it came back for information. */
export interface RevisionSummary {
  revisionNo: number;
  submittedAt: string;
  note: string | null;
  returnedAt: string | null;
}

/** A row of the club's requests (GET /customer/requests). */
export interface RequestSummary {
  id: string;
  code: string | null;
  status: RequestStatus;
  origin: Endpoint | null;
  destination: Endpoint | null;
  departureDate: string | null;
  horseCount: number;
  createdAt: string;
  submittedAt: string | null;
  /** The latest issued quotation; null until one is issued. */
  quotation: QuotationIssuedRef | null;
}

/** The body of POST and PUT /customer/requests, sent whole: a field left out is cleared. */
export interface RequestDraftInput {
  horses: { horseId: string; withFoal: boolean }[];
  originPlaceId: string | null;
  originText: string | null;
  destinationPlaceId: string | null;
  destinationText: string | null;
  departureDate: string | null;
  dateFlexDays: number;
  arrivalMode: ArrivalMode;
  /** ISO instants with the +07:00 offset. */
  windowStart: string | null;
  windowEnd: string | null;
  specialInstructions: string | null;
  mode: TransportMode | null;
  trailer: TrailerType | null;
  airClass: ServiceClass | null;
  insurance: InsuranceOption | null;
  vetEscort: boolean;
}

/** Where the customer's instant estimate stands (POST /customer/requests/estimate). */
export const EstimateStatusEnum = {
  READY: 'READY',
  UNAVAILABLE: 'UNAVAILABLE',
  NOT_READY: 'NOT_READY',
  NOT_RUN: 'NOT_RUN',
} as const;
export type EstimateStatus = (typeof EstimateStatusEnum)[keyof typeof EstimateStatusEnum];

/** One wizard choice and how it moves the range (signed deltas, an exact figure, or why not). */
export interface OptionEffect {
  value: string;
  current: boolean;
  deltaLow: number | null;
  deltaHigh: number | null;
  exact: number | null;
  unavailable: string | null;
}

/** The customer's indicative range: never a quotation, never acceptable (BR-Q-10). */
export interface Estimate {
  status: EstimateStatus;
  low: number | null;
  high: number | null;
  message: string | null;
  assumptions: string[];
  versionNo: number | null;
  options: {
    mode: OptionEffect[];
    trailer: OptionEffect[];
    airClass: OptionEffect[];
    insurance: OptionEffect[];
    arrivalWindow: OptionEffect[];
  };
}
