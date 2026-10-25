import type { FlightAllocation, RouteStopKind } from './job';
export const TripRecordKindEnum = {
  LOADED: 'LOADED',
  DEPARTED: 'DEPARTED',
  ARRIVED_AT_STOP: 'ARRIVED_AT_STOP',
  CLEARED_BORDER: 'CLEARED_BORDER',
  HELD: 'HELD',
  LEFT_STOP: 'LEFT_STOP',
  CONDITION_CHECK: 'CONDITION_CHECK',
  ACCEPTED_BY_AIRLINE: 'ACCEPTED_BY_AIRLINE',
  FLIGHT_DEPARTED: 'FLIGHT_DEPARTED',
  FLIGHT_LANDED: 'FLIGHT_LANDED',
  RELEASED_BY_AIRLINE: 'RELEASED_BY_AIRLINE',
  DELIVERED: 'DELIVERED',
  HANDED_OVER: 'HANDED_OVER',
  NOTE: 'NOTE',
} as const;
export type TripRecordKind = (typeof TripRecordKindEnum)[keyof typeof TripRecordKindEnum];

export const HorseConditionEnum = {
  SOUND: 'SOUND',
  WATCH: 'WATCH',
  CONCERN: 'CONCERN',
} as const;
export type HorseCondition = (typeof HorseConditionEnum)[keyof typeof HorseConditionEnum];

export const TripStatusEnum = {
  NOT_STARTED: 'NOT_STARTED',
  DEPARTED: 'DEPARTED',
  HELD: 'HELD',
  ARRIVED: 'ARRIVED',
  DELIVERED: 'DELIVERED',
} as const;
export type TripStatus = (typeof TripStatusEnum)[keyof typeof TripStatusEnum];

export interface TripPhoto {
  id: string;
  fileName: string;
  contentType: string;
  contentUrl: string;
}
export interface TripCondition {
  horseId: string;
  horseName: string;
  condition: HorseCondition;
  drinking: boolean | null;
  eating: boolean | null;
  note: string | null;
  photos: TripPhoto[];
}
export interface TripRecord {
  id: string;
  routeStopId: string | null;
  checkpointName: string | null;
  kind: TripRecordKind;
  occurredAt: string;
  receivedAt: string;
  clientRef: string;
  recordedBy: string | null;
  channel: 'WEB' | 'CAB_TABLET' | 'SYSTEM';
  text: string | null;
  conditions: TripCondition[];
}
/** The customer's name for a stop only another job on a shared trailer needs (BE TripMapper.ON_THE_WAY). */
export const ON_THE_WAY = 'ON_THE_WAY';
export interface TripStop {
  id: string;
  sequence: number;
  /** ON_THE_WAY for the customer on a stop only another job needs: no place, no notes. */
  kind: RouteStopKind | typeof ON_THE_WAY;
  /** On a shared trip, whose pickup or delivery this is; staff and the crew only. */
  jobCode: string | null;
  name: string;
  plannedAt: string | null;
  plannedStayMin: number | null;
  details: string | null;
  latestStatus: TripRecordKind | null;
  latestOccurredAt: string | null;
  latestNote: string | null;
  latestRecordedBy: string | null;
}
export interface TripHorse {
  id: string;
  name: string;
  stall: string | null;
  /** The job the horse travels under. */
  jobCode: string;
}
/** The trip's flight as its people follow it (US-F3-15). */
export interface TripFlight {
  airline: string;
  flightNo: string;
  aircraftType: string | null;
  scheduledDepartureAt: string | null;
  scheduledArrivalAt: string | null;
  estimatedDepartureAt: string | null;
  estimatedArrivalAt: string | null;
  /** Every job's for staff and the crew; only their own for the customer. */
  consignments: FlightAllocation[];
}
/**
 * One part of a job that spans trips: split by an incident (US-F5-06), or planned as a chain of
 * trips, road, air, road (US-F3-16).
 */
export interface TripPart {
  tripId: string;
  /** Staff and the crew only. */
  tripCode: string | null;
  status: TripStatus;
  horses: string[];
  leftInCare: string[];
  plannedDepartureAt: string | null;
  plannedArrivalAt: string | null;
  /** The part this view shows. */
  current: boolean;
  /** The trip's catalog corridor, "RD HCM -> PNH", and whether it drives or flies. */
  corridorCode: string | null;
  mode: 'ROAD' | 'AIR' | null;
  /** True when this part hands its horses on to the next trip of the journey. */
  handsOn: boolean;
}
export interface TripSummary {
  /** The job the trip's page opens with. */
  jobCode: string;
  tripStatus: TripStatus;
  origin: string | null;
  destination: string | null;
  lastUpdate: string | null;
  /** The escort's list has a row per trip, with its TRP code; null elsewhere. */
  tripCode: string | null;
  /** Every job the escort's trip carries; the one job elsewhere. */
  jobCodes: string[];
}
export interface TripPage {
  content: TripSummary[];
  number: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
/** A job's handover at the destination (US-F6-01), then the customer's answer (US-F6-02). */
export interface Handover {
  deliveredAt: string | null;
  handedOverAt: string | null;
  receiverName: string | null;
  receiverConfirmed: boolean;
  /** The HANDED_OVER record in the trip's records: each horse's condition and what was handed over. */
  recordId: string | null;
  confirmDueAt: string | null;
  customerOutcome: 'CONFIRMED_SOUND' | 'PROBLEM_REPORTED' | null;
  confirmedAt: string | null;
  confirmedByName: string | null;
  lateMinutes: number | null;
  /** What the customer said went wrong, as written (US-F6-02), and the incident it opened. */
  discrepancy: string | null;
  discrepancyIncidentId: string | null;
  /** No answer by the due time: taken as accepted. */
  acceptedByDefault: boolean;
}

export interface TripView {
  jobCode: string;
  /** The trip's TRP code for staff and the crew; null for the customer, who never sees it. */
  tripCode: string | null;
  tripStatus: TripStatus;
  clearanceReady: boolean;
  plannedDepartureAt: string | null;
  plannedArrivalAt: string | null;
  arrivalWindowStart: string | null;
  arrivalWindowEnd: string | null;
  origin: string | null;
  destination: string | null;
  /** The confirmed trailers; for the escort, the ones they ride. */
  vehicleCode: string | null;
  /** True when the trailer carries another job too. The customer is told only that, never whose. */
  shared: boolean;
  /** The confirmed route's flights; for the customer, with only their own consignment (US-F3-15). */
  flights: TripFlight[];
  stops: TripStop[];
  horses: TripHorse[];
  records: TripRecord[];
  /** Every part of a job split across trips; empty while it is on one (US-F5-06). */
  parts: TripPart[];
  /** The job's handover once its horses are delivered (US-F6-01). */
  handover: Handover | null;
}
export interface TripRecordInput {
  routeStopId: string | null;
  kind: TripRecordKind;
  occurredAt: string;
  clientRef: string;
  text?: string;
  /** Who received the horses; required when kind is HANDED_OVER. */
  receiverName?: string;
  /** The receiver confirmed on the tablet; required when kind is HANDED_OVER (US-F6-01). */
  receiverConfirmed?: boolean;
  conditions?: Array<{
    horseId: string;
    condition: HorseCondition;
    drinking: boolean | null;
    eating: boolean | null;
    note?: string;
    photoFileIds?: string[];
  }>;
}
