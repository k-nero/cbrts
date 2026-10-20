import type { BaseEntity } from './api';
import type { DossierStatus } from './clearance';
import type { TripStatus } from './trip';
import type { StallSide, StallType } from './vehicle';

export const JobStageEnum = {
  DOCUMENTS: 'DOCUMENTS',
  CLEARANCE: 'CLEARANCE',
  TRIP: 'TRIP',
  HANDOVER: 'HANDOVER',
  CLOSED: 'CLOSED',
} as const;
export type JobStage = (typeof JobStageEnum)[keyof typeof JobStageEnum];

export const CrewRoleEnum = {
  DRIVER: 'DRIVER',
  GROOM: 'GROOM',
  FLYING_GROOM: 'FLYING_GROOM',
  VET: 'VET',
} as const;
export type CrewRole = (typeof CrewRoleEnum)[keyof typeof CrewRoleEnum];

export const RouteStopKindEnum = {
  PICKUP: 'PICKUP',
  BORDER: 'BORDER',
  WELFARE: 'WELFARE',
  DELIVERY: 'DELIVERY',
  AIRPORT_OUT: 'AIRPORT_OUT',
  AIRPORT_IN: 'AIRPORT_IN',
  QUARANTINE: 'QUARANTINE',
  REFUELLING: 'REFUELLING',
} as const;
export type RouteStopKind = (typeof RouteStopKindEnum)[keyof typeof RouteStopKindEnum];

export const TransportModeEnum = {
  ROAD: 'ROAD',
  AIR: 'AIR',
} as const;
export type TransportMode = (typeof TransportModeEnum)[keyof typeof TransportModeEnum];

export interface JobHorse {
  id: string;
  name: string;
  sex: string;
  breed?: string | null;
  weightKg?: number | null;
  sizeClassCode?: string | null;
  requiredStall?: StallType | null;
  temperament?: string | null;
  handlingNotes?: string | null;
}

export interface CrewMember {
  userId: string;
  name: string;
  staffCode?: string | null;
  email: string;
  crewRole: CrewRole;
}

export interface LoadPlanConflict {
  horseId?: string | null;
  horseName?: string | null;
  stallId?: string | null;
  stallPositionNo?: number | null;
  rule: string;
  description: string;
}

export interface LoadPlanStall {
  stallId: string;
  positionNo: number;
  stallType: StallType;
  rowNo: number;
  side: StallSide;
  nearRamp: boolean;
  horse?: JobHorse | null;
  issue?: string | null;
}

export interface LoadPlan {
  id: string;
  jobId: string;
  vehicleId: string;
  vehicleCode: string;
  status: 'DRAFT' | 'CONFIRMED';
  confirmedByName?: string | null;
  confirmedAt?: string | null;
  totalWeightKg: number;
  payloadKg: number;
  stalls: LoadPlanStall[];
  unassignedHorses: JobHorse[];
  conflicts: LoadPlanConflict[];
}

/**
 * One drag or click on the load plan, with what the coordinator's screen showed. The server
 * refuses it (409, LOAD_PLAN_STALE) when someone else changed those stalls in the meantime.
 */
export interface MoveHorse {
  horseId: string;
  /** The stall the horse was in; null when it was waiting to load. */
  fromStallId: string | null;
  /** The stall to put it in; null to take it off the vehicle. */
  toStallId: string | null;
  /** The horse seen in the target stall; null when it looked empty. Set means swap. */
  expectedOccupantId: string | null;
}

export interface FlightInfo {
  id?: string;
  airline: string;
  flightNo: string;
  airWaybill?: string | null;
  aircraftType?: string | null;
  stallPositions?: number | null;
  serviceClass?: string | null;
  scheduledDepartureAt?: string | null;
  scheduledArrivalAt?: string | null;
}

export interface RouteStop {
  id: string;
  seq: number;
  kind: RouteStopKind;
  placeId?: string | null;
  placeName?: string | null;
  borderCrossingId?: string | null;
  borderCrossingName?: string | null;
  plannedAt?: string | null;
  plannedStayMin?: number | null;
  details?: string | null;
}

export interface RouteLeg {
  id: string;
  seq: number;
  fromStopId: string;
  toStopId: string;
  mode: TransportMode;
  vehicleId?: string | null;
  vehicleCode?: string | null;
  distanceKm?: number | null;
  plannedMin?: number | null;
  flight?: FlightInfo | null;
}

export interface RoutePlan {
  id: string;
  jobId: string;
  versionNo: number;
  status: 'DRAFT' | 'CONFIRMED' | 'SUPERSEDED';
  distanceKm?: number | null;
  durationMin?: number | null;
  confirmedByName?: string | null;
  confirmedAt?: string | null;
  supersededAt?: string | null;
  changeReason?: string | null;
  stops: RouteStop[];
  legs: RouteLeg[];
}

export interface JobSummary extends BaseEntity {
  code: string;
  originCity: string;
  destinationCity: string;
  horseCount: number;
  horseNames: string[];
  stage: JobStage;
  dossierStatus: DossierStatus;
  tripStatus: TripStatus;
  plannedDepartureAt?: string | null;
  windowStart?: string | null;
  windowEnd?: string | null;
  clearanceReadyAt?: string | null;
  blockingReason?: string | null;
  nextStepOwner?: string | null;
  clubName?: string | null;
}

export interface JobDetail extends BaseEntity {
  code: string;
  originCity: string;
  destinationCity: string;
  stage: JobStage;
  dossierStatus: DossierStatus;
  tripStatus: TripStatus;
  plannedDepartureAt?: string | null;
  windowStart?: string | null;
  windowEnd?: string | null;
  clearanceReadyAt?: string | null;
  blockingReason?: string | null;
  nextStepOwner?: string | null;
  clearanceGateState: 'Locked' | 'Clear';
  clearanceGateSummary: string;
  horses: JobHorse[];
  loadPlan: LoadPlan;
  routePlan?: RoutePlan | null;
  crew: CrewMember[];
}

/** The Jobs list tabs (TransportJobService.search's filter). */
export const JobFilterEnum = {
  ALL: 'ALL',
  NEEDS_ME: 'NEEDS_ME',
  BLOCKED: 'BLOCKED',
  IN_TRANSIT: 'IN_TRANSIT',
} as const;
export type JobFilter = (typeof JobFilterEnum)[keyof typeof JobFilterEnum];

export interface JobListParams {
  q?: string;
  stage?: JobStage;
  filter?: JobFilter;
  page?: number;
  size?: number;
  sort?: string;
}
