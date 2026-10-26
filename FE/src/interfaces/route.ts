import type { TransportMode } from './job';

/** `places.kind`. */
export const PlaceKindEnum = {
  TRAINING_CENTRE: 'TRAINING_CENTRE',
  STUD: 'STUD',
  RACECOURSE: 'RACECOURSE',
  STABLE: 'STABLE',
  AIRPORT: 'AIRPORT',
  CARGO_TERMINAL: 'CARGO_TERMINAL',
  QUARANTINE: 'QUARANTINE',
  WELFARE_STOP: 'WELFARE_STOP',
} as const;
export type PlaceKind = (typeof PlaceKindEnum)[keyof typeof PlaceKindEnum];

/** A country we serve (GET /staff/countries). */
export interface CountryOption {
  id: string;
  code: string;
  name: string;
}

/** POST /staff/corridors: a new route and, by road, its crossings in order from the origin. */
export interface CreateCorridorInput {
  code: string;
  mode: TransportMode;
  originCity: string;
  destinationCity: string;
  distanceKm: number | null;
  dateFlexDays: number;
  crossingIds: string[];
}

/** POST /staff/places. */
export interface CreatePlaceInput {
  name: string;
  kind: PlaceKind;
  city: string;
  countryId: string;
  address: string | null;
}

/** POST /staff/border-crossings. */
export interface CreateBorderCrossingInput {
  name: string;
  fromCountryId: string;
  toCountryId: string;
  roadOnly: boolean;
}
