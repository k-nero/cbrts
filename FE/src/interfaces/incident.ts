import type { HistoryEntry } from './request';
import type { TripPhoto, TripStatus } from './trip';

/** What happened (BE IncidentKind). The cab reports the last four; HELD and CUSTOMER_REPORT come from elsewhere. */
export const IncidentKindEnum = {
  HELD: 'HELD',
  CUSTOMER_REPORT: 'CUSTOMER_REPORT',
  WELFARE: 'WELFARE',
  VEHICLE: 'VEHICLE',
  TRAFFIC: 'TRAFFIC',
  OTHER: 'OTHER',
  LATE_ARRIVAL: 'LATE_ARRIVAL',
  /** A coordinator's delay alert for bad weather or a border queue (US-F5-04); traffic is TRAFFIC. */
  WEATHER: 'WEATHER',
  BORDER_CONGESTION: 'BORDER_CONGESTION',
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
  /** The approved option (US-F5-03). */
  decidedOptionId: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  /** What the customer was told, as written. */
  customerMessage: string | null;
  chargeCustomer: boolean | null;
  /** The extra cost attached to the job for the final invoice. */
  chargedAmount: number | null;
  /** The route version the decision gave the trip. */
  routePlanVersion: number | null;
  /** The trip the leaving horses moved to (US-F5-06). */
  newTripCode: string | null;
  /** The job's horses on its moving trip, which an option can take off it. */
  riding: { id: string; name: string }[];
  /** The arrival the latest delay alert announced (US-F5-04). */
  etaAt: string | null;
  /** How it ended and the closing note, once closed (US-F5-05). */
  resolution: string | null;
  closingNote: string | null;
  resolvedAt: string | null;
  resolvedByName: string | null;
  /** What happened to the incident, from the audit trail, oldest first. */
  timeline: HistoryEntry[];
}

/** One incident on a job's trip record, with its timeline (GET /staff/jobs/{id}/incidents, US-F5-05). */
export interface JobIncident {
  id: string;
  kind: IncidentKind;
  kindLabel: string;
  status: IncidentStatus;
  summary: string;
  openedAt: string;
  ownerName: string | null;
  etaAt: string | null;
  resolution: string | null;
  closingNote: string | null;
  resolvedAt: string | null;
  resolvedByName: string | null;
  timeline: HistoryEntry[];
}

/** A delay alert (US-F5-04): why, the job's new arrival (ISO with offset), and a note its customer and crew read. */
export interface DelayAlertInput {
  reason: 'TRAFFIC' | 'WEATHER' | 'BORDER_CONGESTION';
  newEta: string;
  note?: string;
}

/** Closing an incident (US-F5-05): both are required. */
export interface ResolveIncidentInput {
  resolution: string;
  closingNote: string;
}

/** How horses leave a moving trip (BE LeavingKind, US-F5-06). */
export const LeavingKindEnum = {
  UNLOAD: 'UNLOAD',
  SECOND_VEHICLE: 'SECOND_VEHICLE',
  RETURN_TO_ORIGIN: 'RETURN_TO_ORIGIN',
  LEAVE_IN_CARE: 'LEAVE_IN_CARE',
} as const;
export type LeavingKind = (typeof LeavingKindEnum)[keyof typeof LeavingKindEnum];

/** The manager's approval of the proposed option (US-F5-03). */
export interface DecideIncidentInput {
  optionId: string;
  note?: string;
  /** Sent to the customer as written. */
  customerMessage: string;
  chargeCustomer: boolean;
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
  /** How horses leave the trip with this option, or null (US-F5-06). */
  leavingKind: LeavingKind | null;
  leavingKindLabel: string | null;
  leavingPlace: string | null;
  vehicleCode: string | null;
  /** Who bears the extra cost as proposed. */
  customerPays: boolean;
  horseNames: string[];
}

export interface IncidentOptionInput {
  title: string;
  description?: string;
  extraCost: number;
  delayMinutes: number;
  changesRoute: boolean;
  leavingKind?: LeavingKind;
  horseIds?: string[];
  leavingPlace?: string;
  vehicleId?: string;
  customerPays: boolean;
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
