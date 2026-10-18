import type { HorseSex } from './horse';
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
  /** YYYY-MM-DD. */
  earliestDeparture: string | null;
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

/** A transport request (GET /customer/requests/{id}); `leadTime` and `blockers` only for a draft. */
export interface TransportRequest {
  id: string;
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
