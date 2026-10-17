import { ict } from './time';

import type {
  ArrivalMode,
  Blocker,
  Endpoint,
  InsuranceOption,
  RequestDraftInput,
  ServiceClass,
  TrailerType,
  TransportMode,
  TransportRequest,
} from '@/interfaces';

/*
 * The request wizard's pure helpers (FE slice 2): the form's values to the API's body and back, which
 * step owns each blocker, and the words the pass, the route strip and the review show.
 */

export type WizardStep = 'horses' | 'route' | 'service' | 'review';
export type FieldStep = Exclude<WizardStep, 'review'>;
export const WIZARD_STEPS: WizardStep[] = ['horses', 'route', 'service', 'review'];

/** A From/To choice: a place (`value` is its id), or a typed city (react-select creatable's `__isNew__`). */
export type PlaceOption = { value: string; label: string; __isNew__?: boolean };
/** A time of day, `value` HH:mm. */
export type TimeOption = { value: string; label: string };

export interface WizardValues {
  horses: { horseId: string; withFoal: boolean }[];
  origin: PlaceOption | null;
  destination: PlaceOption | null;
  /** YYYY-MM-DD. */
  departureDate: string | null;
  /** "My dates can move by ±3 days". */
  flexible: boolean;
  arrivalMode: ArrivalMode;
  /** YYYY-MM-DD, the window's day. */
  arriveOn: string | null;
  windowFrom: TimeOption | null;
  windowUntil: TimeOption | null;
  specialInstructions: string;
  mode: TransportMode | null;
  trailer: TrailerType | null;
  airClass: ServiceClass | null;
  insurance: InsuranceOption | null;
  vetEscort: boolean;
}

export const EMPTY_WIZARD: WizardValues = {
  horses: [],
  origin: null,
  destination: null,
  departureDate: null,
  flexible: false,
  arrivalMode: 'ANY_TIME',
  arriveOn: null,
  windowFrom: null,
  windowUntil: null,
  specialInstructions: '',
  mode: null,
  trailer: null,
  airClass: null,
  insurance: null,
  vetEscort: false,
};

const blankToNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
};

/** "Phú Thọ training centre, Ho Chi Minh City", or the city as typed. */
export const endpointLabel = (e: Endpoint): string =>
  e.placeId ? `${e.name}, ${e.city}` : (e.text ?? '');

const toOption = (e: Endpoint | null): PlaceOption | null => {
  if (!e) return null;
  if (e.placeId) return { value: e.placeId, label: endpointLabel(e) };
  return e.text ? { value: e.text, label: e.text, __isNew__: true } : null;
};

const asTime = (iso: string | null): TimeOption | null => {
  if (!iso) return null;
  const hhmm = ict(iso).format('HH:mm');
  return { value: hhmm, label: hhmm };
};

/** The wizard's form values for a saved request. Window times are read in Vietnam time. */
export const fromRequest = (r: TransportRequest): WizardValues => ({
  horses: r.horses.map((h) => ({ horseId: h.horseId, withFoal: h.withFoal })),
  origin: toOption(r.origin),
  destination: toOption(r.destination),
  departureDate: r.departureDate,
  flexible: r.dateFlexDays === 3,
  arrivalMode: r.arrivalMode ?? 'ANY_TIME',
  arriveOn: r.windowStart ? ict(r.windowStart).format('YYYY-MM-DD') : null,
  windowFrom: asTime(r.windowStart),
  windowUntil: asTime(r.windowEnd),
  specialInstructions: r.specialInstructions ?? '',
  mode: r.mode,
  trailer: r.trailer,
  airClass: r.airClass,
  insurance: r.insurance,
  vetEscort: r.vetEscort,
});

const endOf = (o: PlaceOption | null): { placeId: string | null; text: string | null } =>
  !o
    ? { placeId: null, text: null }
    : o.__isNew__
      ? { placeId: null, text: blankToNull(o.value) }
      : { placeId: o.value, text: null };

/** "2026-10-31T08:00:00+07:00": built as a string, so the browser's own zone never shifts it. */
const instant = (day: string | null, t: TimeOption | null): string | null =>
  day && t ? `${day}T${t.value}:00+07:00` : null;

/**
 * The full PUT body for the form's values. A window books a road move with a private trailer and
 * fixed dates (backend R-04), so those go with it.
 */
export const toDraftInput = (v: WizardValues): RequestDraftInput => {
  const origin = endOf(v.origin);
  const destination = endOf(v.destination);
  const window = v.arrivalMode === 'WINDOW';
  return {
    horses: v.horses.map((h) => ({ horseId: h.horseId, withFoal: h.withFoal })),
    originPlaceId: origin.placeId,
    originText: origin.text,
    destinationPlaceId: destination.placeId,
    destinationText: destination.text,
    departureDate: v.departureDate,
    dateFlexDays: !window && v.flexible ? 3 : 0,
    arrivalMode: v.arrivalMode,
    windowStart: window ? instant(v.arriveOn, v.windowFrom) : null,
    windowEnd: window ? instant(v.arriveOn, v.windowUntil) : null,
    specialInstructions: blankToNull(v.specialInstructions),
    mode: window ? 'ROAD' : v.mode,
    trailer: window ? 'PRIVATE' : v.trailer,
    airClass: window ? null : v.airClass,
    insurance: v.insurance,
    vetEscort: v.vetEscort,
  };
};

/** The form fields each step renders; a change to any of them retires that step's saved blockers. */
export const STEP_FIELDS: Record<FieldStep, (keyof WizardValues)[]> = {
  horses: ['horses'],
  route: [
    'origin',
    'destination',
    'departureDate',
    'flexible',
    'arrivalMode',
    'arriveOn',
    'windowFrom',
    'windowUntil',
    'specialInstructions',
  ],
  service: ['mode', 'trailer', 'airClass', 'insurance', 'vetEscort'],
};

const STEP_OF_FIELD: Record<string, FieldStep> = {
  horses: 'horses',
  origin: 'route',
  destination: 'route',
  departureDate: 'route',
  windowStart: 'route',
  mode: 'service',
  trailer: 'service',
  airClass: 'service',
  insurance: 'service',
};

/** The step whose fields a blocker is about (the backend's `field`). */
export const stepOfBlocker = (b: Blocker): FieldStep => STEP_OF_FIELD[b.field] ?? 'route';

/** Whether a blocker keeps the customer on its step; an incomplete horse is fixed on its profile. */
export const holdsStep = (b: Blocker): boolean => b.code !== 'HORSE_INCOMPLETE';

/** Where a resumed draft opens: the first step with a blocker, else Review. */
export const firstOpenStep = (r: TransportRequest): WizardStep => {
  const steps = new Set((r.blockers ?? []).map(stepOfBlocker));
  return WIZARD_STEPS.find((s) => s !== 'review' && steps.has(s)) ?? 'review';
};

/** The saved blockers still standing: one whose step has an unsaved change no longer applies. */
export const liveBlockers = (blockers: Blocker[], changed: (keyof WizardValues)[]): Blocker[] => {
  const dirtySteps = new Set(
    (Object.keys(STEP_FIELDS) as FieldStep[]).filter((s) =>
      STEP_FIELDS[s].some((f) => changed.includes(f)),
    ),
  );
  return blockers.filter((b) => !dirtySteps.has(stepOfBlocker(b)));
};

const minutesOf = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Minutes from `from` to `until` on one day. */
export const windowMinutes = (from: string, until: string): number =>
  minutesOf(until) - minutesOf(from);

/** "A 4-hour window.", "A 3½-hour window." */
export const windowLength = (from: string, until: string): string => {
  const minutes = windowMinutes(from, until);
  const hours = Math.floor(minutes / 60);
  const half = minutes % 60 >= 30 ? '½' : '';
  return `A ${hours}${half}-hour window.`;
};
