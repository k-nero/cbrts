import type { BaseEntity } from './api';
import type { CountryOption } from './route';

export const VehicleKindEnum = {
  TRAILER: 'TRAILER',
  TRUCK: 'TRUCK',
} as const;
export type VehicleKind = (typeof VehicleKindEnum)[keyof typeof VehicleKindEnum];

export const VehicleStatusEnum = {
  ACTIVE: 'ACTIVE',
  MAINTENANCE: 'MAINTENANCE',
  RETIRED: 'RETIRED',
} as const;
export type VehicleStatus = (typeof VehicleStatusEnum)[keyof typeof VehicleStatusEnum];

export const StallTypeEnum = {
  STANDARD: 'STANDARD',
  BOX: 'BOX',
  CLIMATE: 'CLIMATE',
} as const;
export type StallType = (typeof StallTypeEnum)[keyof typeof StallTypeEnum];

export const StallSideEnum = {
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
} as const;
export type StallSide = (typeof StallSideEnum)[keyof typeof StallSideEnum];

export interface VehicleStall extends BaseEntity {
  positionNo: number;
  stallType: StallType;
  rowNo: number;
  side: StallSide;
  nearRamp: boolean;
}

export interface Vehicle extends BaseEntity {
  code: string;
  kind: VehicleKind;
  payloadKg: number;
  status: VehicleStatus;
  stallCount: number;
  stalls: VehicleStall[];
  /** Where it is based, and where it is when it has run no trip yet (US-F7-01). */
  homeCountry: CountryOption;
  /** The foreign countries it holds a permit for. */
  permittedCountries: CountryOption[];
  /** The road corridors it works; a road trip takes it only on one of these. */
  operatingCorridors: { id: string; code: string }[];
  /** Listed for a trip only: whether it may join that trip, and why not. */
  available?: boolean | null;
  unavailableReason?: string | null;
}

export interface VehicleBooking extends BaseEntity {
  vehicleId: string;
  vehicleCode: string;
  vehicleKind?: VehicleKind;
  /** The trip's TRP code, for a JOB booking. */
  tripCode?: string | null;
  /** Set when the trip carries one job. */
  jobId?: string | null;
  /** The codes of the trip's jobs, comma-separated. */
  jobCode?: string | null;
  kind: 'JOB' | 'MAINTENANCE' | 'HOLD';
  startsAt: string;
  endsAt: string;
}

export interface CreateVehicleInput {
  code: string;
  kind: VehicleKind;
  payloadKg: number;
  stalls: {
    positionNo: number;
    stallType: StallType;
    rowNo: number;
    side: StallSide;
    nearRamp: boolean;
  }[];
  homeCountryId: string;
  permittedCountryIds: string[];
  operatingCorridorIds: string[];
}

/** A missing field stays as it is; a list replaces the whole set. */
export interface UpdateVehicleInput {
  payloadKg?: number;
  status?: VehicleStatus;
  homeCountryId?: string;
  permittedCountryIds?: string[];
  operatingCorridorIds?: string[];
}

export interface VehicleBookingInput {
  vehicleId: string;
  jobId?: string | null;
  kind: string;
  startsAt: string;
  endsAt: string;
}
