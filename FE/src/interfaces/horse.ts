import type { BaseEntity } from './api';
import type { StallType } from './vehicle';

export const HorseSexEnum = {
  STALLION: 'STALLION',
  MARE: 'MARE',
  GELDING: 'GELDING',
  COLT: 'COLT',
  FILLY: 'FILLY',
} as const;
export type HorseSex = (typeof HorseSexEnum)[keyof typeof HorseSexEnum];

export const HorseCoatEnum = {
  GREY: 'GREY',
  BLACK: 'BLACK',
  CHESTNUT: 'CHESTNUT',
  BAY: 'BAY',
  OTHER: 'OTHER',
} as const;
export type HorseCoat = (typeof HorseCoatEnum)[keyof typeof HorseCoatEnum];

export const TemperamentEnum = {
  CALM: 'CALM',
  NERVOUS: 'NERVOUS',
  AGGRESSIVE: 'AGGRESSIVE',
} as const;
export type Temperament = (typeof TemperamentEnum)[keyof typeof TemperamentEnum];

/** A height band: the class of a horse from `minHeightHh` up to the next band (backend H-03). */
export interface SizeClass {
  code: string;
  widthIn: number;
  minHeightHh: number;
}

/** A horse of the signed-in club (GET /customer/horses). */
export interface Horse extends BaseEntity {
  name: string;
  coat: HorseCoat | null;
  breed: string | null;
  sex: HorseSex;
  /** YYYY-MM-DD. */
  dateOfBirth: string | null;
  /** Hands.inches, e.g. 16.2. */
  heightHh: number;
  weightKg: number | null;
  sizeClass: { code: string; widthIn: number };
  microchip: string | null;
  passportNo: string | null;
  declaredValue: number;
  valueCurrency: string;
  temperament: Temperament | null;
  requiredStall: StallType;
  handlingNotes: string | null;
  archivedAt: string | null;
  /** Name, microchip, sex, breed, date of birth and coat are locked once the horse was on a submitted request. */
  identityLocked: boolean;
}

/** The body of POST and PUT /customer/horses (HorseRequest). The size class is derived, never sent. */
export interface HorseInput {
  name: string;
  sex: HorseSex;
  coat: HorseCoat | null;
  breed: string | null;
  dateOfBirth: string | null;
  heightHh: number;
  weightKg: number | null;
  microchip: string;
  passportNo: string;
  declaredValue: number;
  temperament: Temperament | null;
  requiredStall: StallType;
  handlingNotes: string | null;
}
