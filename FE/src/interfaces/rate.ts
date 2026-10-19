export interface RateCorridorSummary {
  id: string;
  code: string;
  label: string;
  mode: 'AIR' | 'ROAD';
  originCity: string;
  destinationCity: string;
  distanceKm: number;
  borderCrossingCount: number;
  version: string;
  hasDraft: boolean;
  missingRatesCount: number;
}

export interface RateServiceClass {
  id: string;
  serviceClass: 'ECONOMY' | 'BUSINESS' | 'FIRST';
  serviceClassName: string;
  widthPerHorseIn: number;
  horsesPerPosition: number;
  positionRate: number;
  perHorseRate: number;
}

export interface RateVolumeBreak {
  id: string;
  minHorses: number;
  maxHorses: number | null;
  discountPct: number;
  label: string;
  highlighted: boolean;
  previousValue?: string;
}

export interface RatePolicyItem {
  key?: string;
  label: string;
  valueDisplay: string;
  rawValue: number;
}

export interface RateLine {
  id: string;
  code: string;
  groupCode: string;
  description: string;
  basis: string;
  basisDisplay: string;
  appliesToSex?: string;
  rate: number;
  minCharge?: number;
  certainty: 'FIXED' | 'ESTIMATED';
}

export interface RateCatalogDetail {
  versionId: string;
  versionNo: number;
  status: 'DRAFT' | 'PUBLISHED' | 'RETIRED';
  publishedAt?: string;
  publishedAtDisplay: string;
  changeNote?: string;
  changesCount: number;
  quotesPinnedCount: number;
  corridor: RateCorridorSummary;
  serviceClasses: RateServiceClass[];
  volumeBreaks: RateVolumeBreak[];
  policies: RatePolicyItem[];
  catalogLines: RateLine[];
  hasDraft: boolean;
  draftVersionNo?: number;
  draftChangesSummary?: string;
  draftVersionId?: string;
}

export interface UpdateVolumeBreakRequest {
  discountPct: number;
}

export interface UpdateServiceClassRequest {
  positionRate: number;
}
