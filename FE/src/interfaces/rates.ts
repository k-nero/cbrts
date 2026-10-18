import type { HorseSex } from './horse';
import type { TransportMode } from './job';
import type { ServiceClass, TrailerType } from './request';

export const RateBasisEnum = {
  PER_HORSE: 'PER_HORSE',
  PER_SHIPMENT: 'PER_SHIPMENT',
  PER_KM: 'PER_KM',
  PER_DAY: 'PER_DAY',
  PER_CROSSING: 'PER_CROSSING',
  PER_HOUR: 'PER_HOUR',
  PER_POSITION: 'PER_POSITION',
  /** Grooms: one per three horses, rounded up. */
  PER_THREE_HORSES: 'PER_THREE_HORSES',
  /** The flight vet: from the policy's horse count, above its value threshold, or on a vet escort. */
  FLIGHT_VET: 'FLIGHT_VET',
} as const;
export type RateBasis = (typeof RateBasisEnum)[keyof typeof RateBasisEnum];

export const RateCertaintyEnum = { FIXED: 'FIXED', ESTIMATED: 'ESTIMATED' } as const;
export type RateCertainty = (typeof RateCertaintyEnum)[keyof typeof RateCertaintyEnum];

export const CatalogStatusEnum = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  RETIRED: 'RETIRED',
} as const;
export type CatalogStatus = (typeof CatalogStatusEnum)[keyof typeof CatalogStatusEnum];

export const RatePolicyKeyEnum = {
  FUEL_PCT: 'FUEL_PCT',
  INSURANCE_PCT: 'INSURANCE_PCT',
  CONTINGENCY_PCT: 'CONTINGENCY_PCT',
  SERVICE_FEE_PCT: 'SERVICE_FEE_PCT',
  DEPOSIT_PCT: 'DEPOSIT_PCT',
  QUOTE_VALIDITY_DAYS: 'QUOTE_VALIDITY_DAYS',
  FLIGHT_VET_MIN_HORSES: 'FLIGHT_VET_MIN_HORSES',
  HIGH_VALUE_THRESHOLD: 'HIGH_VALUE_THRESHOLD',
  ARRIVAL_WINDOW_PCT: 'ARRIVAL_WINDOW_PCT',
  ARRIVAL_WINDOW_MIN_HOURS: 'ARRIVAL_WINDOW_MIN_HOURS',
  LATE_PENALTY_PCT_PER_HOUR: 'LATE_PENALTY_PCT_PER_HOUR',
  LATE_PENALTY_CAP_PCT: 'LATE_PENALTY_CAP_PCT',
} as const;
export type RatePolicyKey = (typeof RatePolicyKeyEnum)[keyof typeof RatePolicyKeyEnum];

export const FeeBandKindEnum = {
  CANCELLATION: 'CANCELLATION',
  SHORT_NOTICE: 'SHORT_NOTICE',
} as const;
export type FeeBandKind = (typeof FeeBandKindEnum)[keyof typeof FeeBandKindEnum];

/** One rate catalog version in the Versions panel. */
export interface RateVersion {
  id: string;
  versionNo: number;
  status: CatalogStatus;
  publishedAt: string | null;
  publishedBy: string | null;
  changeNote: string | null;
  quotationsPinned: number;
  lastEditedBy: string | null;
  updatedAt: string | null;
}

/** A corridor in the Rates page's list. */
export interface RateCorridor {
  id: string;
  code: string;
  mode: TransportMode;
  fromCity: string;
  toCity: string;
  distanceKm: number | null;
  crossingCount: number;
  missingCount: number;
}

/** GET /staff/rates/catalog. */
export interface RateCatalog {
  currentVersionId: string | null;
  draftVersionId: string | null;
  versions: RateVersion[];
  corridors: RateCorridor[];
}

export interface ServiceClassRow {
  serviceClass: ServiceClass;
  widthPerHorseIn: number;
  horsesPerPosition: number;
  positionRate: number;
  perHorse: number;
}

export interface RateLine {
  id: string;
  code: string;
  group: string;
  description: string;
  basis: RateBasis;
  appliesToSex: HorseSex | null;
  appliesToTrailer: TrailerType | null;
  rate: number;
  minCharge: number | null;
  defaultQuantity: number | null;
  certainty: RateCertainty;
  estimateNote: string | null;
  everyCorridor: boolean;
}

export interface VolumeBreak {
  minHorses: number;
  maxHorses: number | null;
  discountPct: number;
}

export interface FeeBand {
  kind: FeeBandKind;
  minDays: number;
  maxDays: number | null;
  value: number;
}

/** A rate the catalog can't supply; group is null when it isn't a ledger line. */
export interface MissingRate {
  group: string | null;
  description: string;
  why: string;
}

/** GET /staff/rates/versions/{id}?corridorId=: one corridor's rates in one version. */
export interface RateCorridorView {
  versionId: string;
  versionNo: number;
  status: CatalogStatus;
  corridor: RateCorridor;
  serviceClasses: ServiceClassRow[];
  lines: RateLine[];
  volumeBreaks: VolumeBreak[];
  volumeBreaksScope: 'CORRIDOR' | 'GLOBAL';
  policies: Partial<Record<RatePolicyKey, number>>;
  feeBands: FeeBand[];
  missing: MissingRate[];
}

/** A line to add or change in the draft; corridorId null means every corridor. */
export interface RateLineInput {
  corridorId: string | null;
  code: string;
  group: string;
  description: string;
  basis: RateBasis;
  appliesToSex: HorseSex | null;
  appliesToTrailer: TrailerType | null;
  rate: number;
  minCharge: number | null;
  defaultQuantity: number | null;
  certainty: RateCertainty;
  estimateNote: string | null;
}

export interface ServiceClassInput {
  widthPerHorseIn: number;
  positionRate: number;
}

/** A band as typed in the editor, before it is checked. */
export interface VolumeBreakInput {
  minHorses: number | null;
  maxHorses: number | null;
  discountPct: number | null;
}
