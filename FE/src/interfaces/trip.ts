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
  STABLE: 'STABLE',
  OFF_FEED: 'OFF_FEED',
  STRESSED: 'STRESSED',
  CLIMATE_CHANGE: 'CLIMATE_CHANGE',
  SOUND: 'SOUND',
  WATCH: 'WATCH',
  CONCERN: 'CONCERN',
} as const;
export type HorseCondition = (typeof HorseConditionEnum)[keyof typeof HorseConditionEnum];
export const TripConditionOptions = [
  HorseConditionEnum.STABLE,
  HorseConditionEnum.OFF_FEED,
  HorseConditionEnum.STRESSED,
  HorseConditionEnum.CLIMATE_CHANGE,
] as const;

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
  receiverName: string | null;
  receiverSignature: string | null;
  documentsShown: TripDocument[];
  conditions: TripCondition[];
}
export interface TripStop {
  id: string;
  sequence: number;
  kind: string;
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
export interface TripDocument {
  id: string;
  name: string;
  horseName: string | null;
  reference: string | null;
  status: string;
  validity: string | null;
}
export interface TripSummary {
  jobCode: string;
  tripStatus: TripStatus;
  origin: string | null;
  destination: string | null;
  lastUpdate: string | null;
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
  tripStatus: TripStatus;
  clearanceReady: boolean;
  plannedDepartureAt: string | null;
  plannedArrivalAt: string | null;
  arrivalWindowStart: string | null;
  arrivalWindowEnd: string | null;
  origin: string | null;
  destination: string | null;
  vehicleCode: string | null;
  crew: string[];
  documents: TripDocument[];
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
  receiverName?: string;
  receiverSignature?: string;
  documentsShown?: string[];
  conditions?: Array<{
    horseId: string;
    condition: HorseCondition;
    drinking: boolean | null;
    eating: boolean | null;
    note?: string;
    photoFileIds?: string[];
  }>;
}
