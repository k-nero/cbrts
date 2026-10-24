import type { TripPhoto, TripStatus } from './trip';

/** What happened (BE IncidentKind). The cab reports the last four; HELD and CUSTOMER_REPORT come from elsewhere. */
export const IncidentKindEnum = {
  HELD: 'HELD',
  CUSTOMER_REPORT: 'CUSTOMER_REPORT',
  WELFARE: 'WELFARE',
  VEHICLE: 'VEHICLE',
  TRAFFIC: 'TRAFFIC',
  OTHER: 'OTHER',
} as const;
export type IncidentKind = (typeof IncidentKindEnum)[keyof typeof IncidentKindEnum];

export const IncidentStatusEnum = {
  OPEN: 'OPEN',
  DECIDED: 'DECIDED',
  RESOLVED: 'RESOLVED',
} as const;
export type IncidentStatus = (typeof IncidentStatusEnum)[keyof typeof IncidentStatusEnum];

export type IncidentSource = 'CAB' | 'CUSTOMER' | 'STAFF';

export interface IncidentSummary {
  id: string;
  jobCode: string;
  kind: IncidentKind;
  kindLabel: string;
  status: IncidentStatus;
  source: IncidentSource;
  summary: string;
  location: string | null;
  horseName: string | null;
  openedAt: string;
  ownerName: string | null;
}

export interface Incident {
  id: string;
  jobId: string;
  jobCode: string;
  /** The job's trip; staff only. */
  tripCode: string | null;
  tripStatus: TripStatus;
  origin: string | null;
  destination: string | null;
  kind: IncidentKind;
  kindLabel: string;
  status: IncidentStatus;
  source: IncidentSource;
  /** What happened, as the reporter wrote it. */
  summary: string;
  location: string | null;
  horseName: string | null;
  openedAt: string;
  reportedByName: string | null;
  ownerName: string | null;
  coordinatorName: string | null;
  photos: TripPhoto[];
}

/** An emergency reported from the cab (US-F5-01). */
export interface RaiseIncidentInput {
  kind: IncidentKind;
  location: string;
  description: string;
  /** Required for a horse medical incident. */
  horseId?: string;
  photoFileIds: string[];
  /** The tablet's reference: a resend returns the incident already opened. */
  clientRef: string;
  occurredAt: string;
}
