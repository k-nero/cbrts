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
  /** The job's quotation currency: every cost on the incident is in it. */
  currency: string;
  options: IncidentOption[];
  /** The option waiting for the manager's approval (US-F5-02). */
  proposedOptionId: string | null;
  proposedByName: string | null;
  proposedAt: string | null;
  proposalNote: string | null;
}

/** An option considered for an incident, with its cost side by side (US-F5-02). */
export interface IncidentOption {
  id: string;
  position: number;
  title: string;
  description: string | null;
  extraCost: number;
  /** Minutes it adds to the arrival. */
  delayMinutes: number;
  /** True when it takes the horses another way: approving it gives the trip a new route version. */
  changesRoute: boolean;
  createdByName: string | null;
  createdAt: string;
}

export interface IncidentOptionInput {
  title: string;
  description?: string;
  extraCost: number;
  delayMinutes: number;
  changesRoute: boolean;
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
