import type { RouteStopKind } from './job';
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
  stops: TripStop[];
  horses: TripHorse[];
  records: TripRecord[];
}
export interface TripRecordInput {
  routeStopId: string | null;
  kind: TripRecordKind;
  occurredAt: string;
  clientRef: string;
  text?: string;
  /** Who received the horses; required when kind is HANDED_OVER. */
  receiverName?: string;
  conditions?: Array<{
    horseId: string;
    condition: HorseCondition;
    drinking: boolean | null;
    eating: boolean | null;
    note?: string;
    photoFileIds?: string[];
  }>;
}
