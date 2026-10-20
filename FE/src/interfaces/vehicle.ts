import type { BaseEntity } from './api';

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
}

export interface VehicleBooking extends BaseEntity {
  vehicleId: string;
  vehicleCode: string;
  vehicleKind?: VehicleKind;
  jobId?: string | null;
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
}

export interface UpdateVehicleInput {
  payloadKg?: number;
  status?: VehicleStatus;
}

export interface VehicleBookingInput {
  vehicleId: string;
  jobId?: string | null;
  kind: string;
  startsAt: string;
  endsAt: string;
}
