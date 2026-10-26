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
  /** The city it is based in, and where it is with no trip yet (US-F7-03). */
  homeCity: string;
  /** The foreign countries it holds a permit for. */
  permittedCountries: CountryOption[];
  /** The road corridors it works; a road trip takes it only on one of these. */
  operatingCorridors: { id: string; code: string }[];
  /** The date the coordinator expects it back, 'YYYY-MM-DD' (US-F7-02); null when not set. */
  availableOn?: string | null;
  /** Listed for a trip only: whether it may join that trip, and why not. */
  available?: boolean | null;
  unavailableReason?: string | null;
  /** Listed for a trip only: held for one of the trip's requests since its acceptance (US-F7-02). */
  held?: boolean | null;
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
  /** The request a RESERVED booking holds the vehicle for (US-F7-02). */
  requestCode?: string | null;
  kind: 'JOB' | 'MAINTENANCE' | 'HOLD' | 'RESERVED';
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
  /** The city it is based in (US-F7-03); its home country follows from the city's places. */
  homeCity: string;
  permittedCountryIds: string[];
  operatingCorridorIds: string[];
}

/** A missing field stays as it is; a list replaces the whole set. */
export interface UpdateVehicleInput {
  payloadKg?: number;
  status?: VehicleStatus;
  homeCity?: string;
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
