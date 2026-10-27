import type { BaseEntity } from './api';
import type { DossierStatus } from './clearance';
import type { Place, ServiceClass } from './request';
import type { TripPart, TripStatus } from './trip';
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
  /** Where the job's horses leave this trip for the next trip of its journey (US-F3-16). */
  TRANSFER: 'TRANSFER',
} as const;
export type RouteStopKind = (typeof RouteStopKindEnum)[keyof typeof RouteStopKindEnum];

export const TransportModeEnum = {
  ROAD: 'ROAD',
  AIR: 'AIR',
} as const;
export type TransportMode = (typeof TransportModeEnum)[keyof typeof TransportModeEnum];

/** A draft of one trip's route, as the Route tab's editor saves it (US-F3-17). */
export interface RouteDraftInput {
  distanceKm?: number | null;
  durationMin?: number | null;
  changeReason?: string;
  stops: {
    seq: number;
    kind: RouteStopKind;
    /** The job a pickup, delivery or transfer is for; the job in the URL when left out. */
    jobId?: string | null;
    placeId?: string | null;
    borderCrossingId?: string | null;
    plannedAt?: string | null;
    plannedStayMin?: number | null;
    details?: string | null;
  }[];
  legs: {
    seq: number;
    fromStopSeq: number;
    toStopSeq: number;
    mode: TransportMode;
    vehicleId?: string | null;
    distanceKm?: number | null;
    plannedMin?: number | null;
    flight?: {
      airline: string;
      flightNo: string;
      aircraftType?: string | null;
      stallCapacity?: number | null;
      scheduledDepartureAt?: string | null;
      scheduledArrivalAt?: string | null;
    } | null;
  }[];
}

/** A border crossing a route can stop at. */
export interface BorderCrossing {
  id: string;
  name: string;
  fromCountry: string;
  toCountry: string;
  roadOnly: boolean;
}

/** A route we run, from the catalog: picked for a journey's next trip, and listed on Routes. */
export interface Corridor {
  id: string;
  code: string;
  mode: TransportMode;
  originCity: string;
  destinationCity: string;
  distanceKm: number | null;
  /** How far a request's flexible dates can move on this route; 0 means fixed dates only. */
  dateFlexDays: number;
  /** Days to drive it one way: a trip's length before its route is planned, and an empty drive back (US-F7-02). */
  drivingDays: number;
  /** The border crossings it takes, in order from the origin. */
  crossings: string[];
  /** The countries it passes through, in order: ['VN', 'KH', 'TH'] (US-F7-01). */
  countries: string[];
  /** How many vehicles run it, on Routes; a road route nobody runs can't be planned. */
  vehicleCount?: number | null;
}

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
  /** On a shared trip's load plan, the job the horse travels under. */
  jobCode?: string | null;
}

/** A job on a shared trip, or one that could join it (US-F3-11). */
export interface TripJob {
  jobId: string;
  code: string;
  origin?: string | null;
  destination?: string | null;
  horses: number;
  departureDate?: string | null;
  dateFlexDays: number;
  clearanceReady: boolean;
  departed: boolean;
}

/**
 * An approved job that could share this job's trailer (US-F3-13): it passes every check of joining,
 * with the proposed departure, the horses it adds, the stalls left and what sharing would mix.
 */
export interface ShareSuggestion {
  job: TripJob;
  proposedDeparture: string;
  departFrom: string;
  departTo: string;
  horsesAdded: number;
  /** Null while the trip has no trailer. */
  stallsLeft?: number | null;
  warnings: BiosecurityWarning[];
}

/** A confirmed trip a job could join (US-F3-18), with its clearance state and the warnings joining raises. */
export interface JoinableTrip {
  tripId: string;
  /** Whether the job passes every check of joining; when not, `reason` says which fails. */
  fits: boolean;
  reason: string | null;
  tripCode: string;
  corridorCode: string;
  mode: TransportMode;
  plannedDepartureAt: string | null;
  /** Null when the job doesn't fit. */
  departFrom: string;
  departTo: string;
  /** Stalls left on the trailers once the job is on; null for a trip that only flies, or one it doesn't fit. */
  stallsLeft: number | null;
  jobs: string[];
  jobsCleared: number;
  /** The earliest due date of a document not cleared yet, of every job on it; null when none is open. */
  documentsDueBy: string | null;
  warnings: BiosecurityWarning[];
}

/** The trip after a job joined it: the days every job on it can leave. */
export interface ShareTripResult {
  tripCode: string;
  departFrom: string;
  departTo: string;
  jobs: TripJob[];
}

export interface CrewMember {
  userId: string;
  name: string;
  staffCode?: string | null;
  email: string;
  crewRole: CrewRole;
  /** The trailer this crew member travels with; null for the flight crew. */
  tripVehicleId: string | null;
  vehicleCode: string | null;
  /** True for the trip's flight crew: flying grooms and the flight vet (US-F3-15). */
  onFlight: boolean;
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

/** One trailer's load plan on the trip. */
export interface LoadPlan {
  id: string;
  jobId: string;
  tripVehicleId: string;
  /** The trailer's place in the convoy, from 1. */
  seq: number;
  vehicleId: string;
  vehicleCode: string;
  status: 'DRAFT' | 'CONFIRMED';
  confirmedByName?: string | null;
  confirmedAt?: string | null;
  totalWeightKg: number;
  payloadKg: number;
  stalls: LoadPlanStall[];
  conflicts: LoadPlanConflict[];
}

/**
 * How the trip is loaded (US-F3-10): one plan per trailer, and the horses on the trip not yet on any
 * of them. CONFIRMED once every trailer's plan is.
 */
export interface TripLoad {
  tripCode: string;
  status: 'DRAFT' | 'CONFIRMED';
  confirmedByName?: string | null;
  confirmedAt?: string | null;
  totalWeightKg: number;
  payloadKg: number;
  vehicles: LoadPlan[];
  unassignedHorses: JobHorse[];
  /** Every trailer's conflicts. */
  conflicts: LoadPlanConflict[];
  /** Biosecurity warnings for horses of different jobs on one trailer (US-F3-12). */
  warnings: BiosecurityWarning[];
}

/**
 * A biosecurity warning on a shared trip (US-F3-12). It doesn't block: the coordinator accepts it
 * when sharing or confirming; a changed warning has a new key and is asked again.
 */
export interface BiosecurityWarning {
  key: string;
  kind: 'ISOLATION' | 'HEALTH_TESTS' | 'HEALTH_DOCUMENTS';
  jobCodes: string[];
  horses: string[];
  message: string;
  accepted: boolean;
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

/** One job's consignment on a flight (US-F3-15). */
export interface FlightAllocation {
  id: string;
  jobId: string;
  jobCode: string;
  airWaybill: string | null;
  stallPositions: number | null;
  serviceClass: ServiceClass | null;
}

/** The flight of an air leg: shared by every job on the trip, with one consignment per job (US-F3-15). */
export interface FlightInfo {
  id?: string;
  airline: string;
  flightNo: string;
  aircraftType?: string | null;
  /** The stall positions the airline gives the trip; null until known. */
  stallCapacity?: number | null;
  scheduledDepartureAt?: string | null;
  scheduledArrivalAt?: string | null;
  allocations: FlightAllocation[];
}

export interface FlightAllocationInput {
  airWaybill?: string;
  stallPositions: number;
  serviceClass?: ServiceClass;
}

export interface RouteStop {
  id: string;
  seq: number;
  kind: RouteStopKind;
  /** The job a PICKUP or DELIVERY stop is for; null for a stop of the whole trip. */
  jobId?: string | null;
  jobCode?: string | null;
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
  /** The team chosen at approval (US-F1-07); null on jobs approved before teams were kept. */
  transportSpecialist?: string | null;
  coordinator?: string | null;
  clubName?: string | null;
}

export interface JobDetail extends BaseEntity {
  code: string;
  /** The trip the job travels on (TRP-YYYY-NNN); staff only. */
  tripCode?: string | null;
  originCity: string;
  destinationCity: string;
  /** The request's pickup and delivery places, where a first route draft starts and ends. */
  originPlace?: Place | null;
  destinationPlace?: Place | null;
  stage: JobStage;
  dossierStatus: DossierStatus;
  tripStatus: TripStatus;
  plannedDepartureAt?: string | null;
  windowStart?: string | null;
  windowEnd?: string | null;
  clearanceReadyAt?: string | null;
  blockingReason?: string | null;
  nextStepOwner?: string | null;
  /** The team chosen at approval (US-F1-07); null on jobs approved before teams were kept. */
  transportSpecialist?: string | null;
  coordinator?: string | null;
  clearanceGateState: 'Locked' | 'Clear';
  clearanceGateSummary: string;
  horses: JobHorse[];
  loadPlan: TripLoad | null;
  routePlan?: RoutePlan | null;
  crew: CrewMember[];
  /** Every job on the job's trip, this one included (US-F3-11). */
  tripJobs: TripJob[];
  /** The job's trips in journey order, one while it travels on one trip (US-F5-06, US-F3-16). */
  parts: TripPart[];
  /** The city the journey has reached, where the next trip starts; the origin's with no trip (US-F3-21). */
  journeyEndCity: string | null;
  /** True once the last trip ends in the destination city: no trip can be added after it. */
  journeyComplete: boolean;
  /** Warn lines: the journey ends short of the destination, or leaves the quoted route. */
  journeyWarnings: string[];
  /** Which trips the clearance gate holds back, in words; null with no trip. */
  clearanceJourneyNote: string | null;
}

/** A corridor the next trip of a job's journey can run, read from the city it has reached (US-F3-21). */
export interface JourneyCorridor {
  corridorId: string;
  corridorCode: string;
  mode: TransportMode;
  /** Run from the corridor's destination city to its origin city. */
  reversed: boolean;
  fromCity: string;
  toCity: string;
  /** The trip would end in the city the horses are going to. */
  reachesDestination: boolean;
  /** On the route the customer was quoted. */
  quoted: boolean;
}

/** The airline's flight for a journey's flight trip (US-F3-21); its times become the airport stops'. */
export interface FlightInput {
  airline: string;
  flightNo: string;
  aircraftType: string | null;
  stallCapacity: number | null;
  scheduledDepartureAt: string | null;
  scheduledArrivalAt: string | null;
}

/** Whether a job can be closed, what holds it, or how it was closed (US-F6-04). */
export interface JobClosing {
  closed: boolean;
  /** What stops it closing now, in words; empty when it can close. */
  blockers: string[];
  closedAt: string | null;
  closedByName: string | null;
  onTime: boolean | null;
  lateMinutes: number | null;
  measuredAgainst: string | null;
}

/** The Jobs list tabs (TransportJobService.search's filter). */
export const JobFilterEnum = {
  ALL: 'ALL',
  NEEDS_ME: 'NEEDS_ME',
  BLOCKED: 'BLOCKED',
  IN_TRANSIT: 'IN_TRANSIT',
  /** Not left yet, due to leave in the next 7 days (US-R-01). */
  THIS_WEEK: 'THIS_WEEK',
  /** Closed jobs have left the active boards (US-F6-04). */
  CLOSED: 'CLOSED',
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
