import { formatDay } from './horse';
import { formatDate, ict } from './time';

import type { Tone } from '@/components/ui/tone';
import type {
  ArrivalMode,
  Blocker,
  Endpoint,
  Horse,
  InsuranceOption,
  RequestDraftInput,
  RequestHorse,
  RequestStatus,
  RevisionSummary,
  Route,
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

/**
 * A From/To choice: a place (`value` is its id), or a typed city (react-select creatable's
 * `__isNew__`). `city` names the end on the draft pass.
 */
export type PlaceOption = { value: string; label: string; city?: string; __isNew__?: boolean };
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
  if (e.placeId) return { value: e.placeId, label: endpointLabel(e), city: e.city ?? undefined };
  return e.text ? { value: e.text, label: e.text, city: e.text, __isNew__: true } : null;
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

/** Blockers that only say a value is still empty: not worth saying before the step was tried. */
const MISSING = new Set([
  'NO_HORSES',
  'ORIGIN_MISSING',
  'DESTINATION_MISSING',
  'DEPARTURE_MISSING',
  'MODE_MISSING',
  'TRAILER_MISSING',
  'AIR_CLASS_MISSING',
  'INSURANCE_MISSING',
]);

/**
 * What a step shows of the standing blockers: a wrong value (too soon, not run) at once, an empty
 * one only after the customer pressed Continue on its step.
 */
export const shownBlockers = (live: Blocker[], attempted: FieldStep[]): Blocker[] =>
  live.filter((b) => !MISSING.has(b.code) || attempted.includes(stepOfBlocker(b)));

/** A standing blocker's field on the form; the window's start is checked on its day. */
const FORM_FIELD: Record<string, keyof WizardValues> = {
  origin: 'origin',
  destination: 'destination',
  departureDate: 'departureDate',
  windowStart: 'arriveOn',
};

/**
 * The standing blockers to put on form fields, in the server's sentences. A route we don't run is
 * said by the To helper and its callout instead (DESIGN.md, Say it once); mode, trailer, class and
 * insurance blockers sit under their option groups.
 */
export const blockerFieldErrors = (
  live: Blocker[],
): Partial<Record<keyof WizardValues, string>> => {
  const errors: Partial<Record<keyof WizardValues, string>> = {};
  for (const b of live) {
    const field = FORM_FIELD[b.field];
    if (field && b.code !== 'ROUTE_NOT_RUN' && !errors[field]) errors[field] = b.message;
  }
  return errors;
};

/**
 * The values a refusal shown on a field was about: SAME_PLACE and PLACE_OR_TEXT on To, DATE_FLEX on
 * the departure, ARRIVAL_WINDOW on the window's day and MODE_OPTIONS on Mode. Each list stays on its
 * own step, like the standing blockers; any other field refusal is about its field alone.
 */
const REFUSAL_INPUTS: Partial<Record<keyof WizardValues, (keyof WizardValues)[]>> = {
  destination: ['origin', 'destination'],
  departureDate: ['departureDate', 'flexible'],
  arriveOn: ['arrivalMode', 'arriveOn', 'windowFrom', 'windowUntil', 'flexible'],
  mode: ['mode', 'trailer', 'airClass'],
};

/** The field refusals to retire: those whose values changed since the save that was refused. */
export const retiredRefusals = (
  refused: (keyof WizardValues)[],
  sent: WizardValues,
  now: WizardValues,
): (keyof WizardValues)[] =>
  refused.filter((field) =>
    (REFUSAL_INPUTS[field] ?? [field]).some(
      (input) => JSON.stringify(sent[input]) !== JSON.stringify(now[input]),
    ),
  );

/** Where to bring a refusal into view: a step-level one at its callout, a field one at the field. */
export const revealSelector = (stepLevel: boolean): string =>
  stepLevel ? '[data-refusal]' : '.ant-form-item-has-error, [data-refusal]';

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

/* ---------- the route ---------- */

/** The countries we run, for "within Vietnam"; a route answers country codes only. */
const COUNTRY_NAME: Record<string, string> = {
  VN: 'Vietnam',
  KH: 'Cambodia',
  TH: 'Thailand',
  LA: 'Laos',
  MY: 'Malaysia',
  HK: 'Hong Kong',
};

const km = (n: number | null): string => (n === null ? '' : n.toLocaleString('en-US'));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "About 960 km by road with 2 border crossings, worked out from your route." */
export const routeSentence = (r: Route): string => {
  const country = r.countries?.[0] ?? '';
  const how =
    r.mode === 'AIR'
      ? 'by air'
      : r.crossings.length > 0
        ? `by road with ${plural(r.crossings.length, 'border crossing')}`
        : `by road within ${COUNTRY_NAME[country] ?? (country || 'one country')}`;
  return `About ${km(r.distanceKm)} km ${how}, worked out from your route.`;
};

/** Whether a road move is possible: the corridors aren't known yet, or one of them is by road. */
export const roadRuns = (routes: Route[]): boolean =>
  routes.length === 0 || routes.some((r) => r.mode === 'ROAD');

/** " Also by air: choose on step 3." when the pair runs by the mode the route shown isn't. */
export const alsoByLine = (routes: Route[], shown: Route | null): string => {
  const other = shown && routes.find((r) => r.mode !== shown.mode);
  return other ? ` Also by ${other.mode === 'AIR' ? 'air' : 'road'}: choose on step 3.` : '';
};

/** The route strip's planned stops: the pickup city, each border in travel order, the destination. */
export const routeStops = (
  r: Route,
): { name: string; kind: string; time: string; state: 'upcoming' }[] => [
  { name: r.fromCity, kind: 'Pickup', time: '', state: 'upcoming' },
  ...r.crossings.map((c, i) => ({
    name: c.name,
    kind: `Border ${i + 1}`,
    time: '',
    state: 'upcoming' as const,
  })),
  { name: r.toCity, kind: `~${km(r.distanceKm)} km`, time: '', state: 'upcoming' },
];

const shortCrossing = (name: string): string => name.split(' – ')[0];

/** "2 · Mộc Bài, Poipet", "None · domestic", or "None · by air": a flight has no border post. */
export const bordersSummary = (r: Route): string =>
  r.crossings.length > 0
    ? `${r.crossings.length} · ${r.crossings.map((c) => shortCrossing(c.name)).join(', ')}`
    : r.mode === 'AIR'
      ? 'None · by air'
      : 'None · domestic';

/** What the fleet coordinator works out once the move is approved. */
export const routePlanLine = (r: Route): string =>
  r.mode === 'AIR'
    ? 'The fleet coordinator books the flight and the road transfers at both ends after approval.'
    : 'The fleet coordinator plans the exact road and stops after approval.';

/** "Mộc Bài – Bavet and Poipet – Aranyaprathet". */
const listOf = (items: string[]): string =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

/* ---------- the draft pass ---------- */

export type PassRow = {
  label: string;
  /** Null: no step has set it yet ("Set on step N"). */
  value: string | null;
  step?: 2 | 3;
  mono?: boolean;
  tone?: 'bad' | 'warn';
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "5 Oct", from YYYY-MM-DD without shifting the day. */
export const shortDay = (day: string): string => {
  const [, m, d] = day.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
};

/** "Shared load": a trailer type as a label (option lists, table cells). */
export const TRAILER_LABELS: Record<TrailerType, string> = {
  SHARED: 'Shared load',
  PRIVATE: 'Private trailer',
};
/** "Economy": a service class as a label (option lists, table cells). */
export const SERVICE_CLASS_LABELS: Record<ServiceClass, string> = {
  ECONOMY: 'Economy',
  BUSINESS: 'Business',
  FIRST: 'First',
};

/** "Road · shared load", "Air · business class". */
const serviceWords = (
  mode: TransportMode | null,
  trailer: TrailerType | null,
  airClass: ServiceClass | null,
): string | null => {
  if (!mode) return null;
  const parts = serviceParts(mode, trailer, airClass);
  return parts.detail ? `${parts.mode} · ${parts.detail}` : parts.mode;
};

/**
 * The service as its words, `{ mode: 'Road', detail: 'shared load' }`, for a line that joins them
 * its own way.
 */
export const serviceParts = (
  mode: TransportMode,
  trailer: TrailerType | null,
  airClass: ServiceClass | null,
): { mode: string; detail: string | null } =>
  mode === 'AIR'
    ? {
        mode: 'Air',
        detail: airClass ? `${SERVICE_CLASS_LABELS[airClass].toLowerCase()} class` : null,
      }
    : { mode: 'Road', detail: trailer ? TRAILER_LABELS[trailer].toLowerCase() : null };

/** A window always books road and a private trailer (toDraftInput sends them). */
const effectiveService = (v: WizardValues) =>
  v.arrivalMode === 'WINDOW'
    ? serviceWords('ROAD', 'PRIVATE', null)
    : serviceWords(v.mode, v.trailer, v.airClass);

/**
 * The pass's rows after Horses (DESIGN.md, Draft pass): the values as typed, the borders from the live
 * route, and "too soon" while that blocker still stands (`live`: a change of date or places retires it).
 */
export const passRows = (
  v: WizardValues,
  live: Blocker[],
  route: Route | null,
  notRun: boolean,
): PassRow[] => {
  const day = v.departureDate;
  const tooSoon = day !== null && live.some((b) => b.code === 'LEAD_TIME_TOO_SHORT');
  const flex = v.flexible && v.arrivalMode === 'ANY_TIME' ? ' · ±3 d' : '';
  const departs: PassRow = !day
    ? { label: 'Departs', value: null, step: 2 }
    : tooSoon
      ? { label: 'Departs', value: `${shortDay(day)} · too soon`, mono: true, tone: 'bad' }
      : { label: 'Departs', value: `${formatDay(day)}${flex}`, mono: true };

  let arrival: PassRow = { label: 'Arrival', value: null, step: 2 };
  if (v.arrivalMode === 'WINDOW') {
    if (v.arriveOn && v.windowFrom && v.windowUntil)
      arrival = {
        label: 'Arrival',
        value: `${shortDay(v.arriveOn)} · ${v.windowFrom.value}–${v.windowUntil.value}`,
        mono: true,
      };
  } else if (day) {
    arrival = { label: 'Arrival', value: 'Any time on the day' };
  }

  const borders: PassRow = notRun
    ? { label: 'Borders', value: 'Not run yet', tone: 'warn' }
    : route
      ? { label: 'Borders', value: bordersSummary(route) }
      : { label: 'Borders', value: null, step: 2 };

  const service = effectiveService(v);
  return [
    departs,
    arrival,
    borders,
    service ? { label: 'Service', value: service } : { label: 'Service', value: null, step: 3 },
  ];
};

/** "Road · shared load · 1 climate stall · your own insurance", for the Service step's footer. */
export const serviceLine = (v: WizardValues, horses: RequestHorse[]): string => {
  const climate = horses.filter((h) => h.requiredStall === 'CLIMATE').length;
  const box = horses.filter((h) => h.requiredStall === 'BOX').length;
  const insurance =
    v.insurance === 'OWN_POLICY'
      ? 'your own insurance'
      : v.insurance === 'EQUIFREIGHT'
        ? 'insured through EquiFreight'
        : null;
  return [
    effectiveService(v),
    climate ? plural(climate, 'climate stall') : null,
    box ? plural(box, 'box stall') : null,
    insurance,
  ]
    .filter(Boolean)
    .join(' · ');
};

/* ---------- review ---------- */

export type ReviewRow = { label: string; value: string; step: FieldStep; mono?: boolean };

const INSURANCE_WORDS: Record<InsuranceOption, string> = {
  OWN_POLICY: 'Your own policy · upload it with your documents once the job is approved',
  EQUIFREIGHT: 'Through EquiFreight, on the quotation as its own line',
};

/** What the customer is sending, in the wizard's order (DESIGN.md, Request summary). */
export const reviewRows = (r: TransportRequest): ReviewRow[] => {
  const dash = '—';
  const via = r.route
    ? r.route.crossings.length
      ? `via ${listOf(r.route.crossings.map((c) => c.name))}`
      : 'direct'
    : null;
  const destination = r.destination ? endpointLabel(r.destination) : dash;
  const arrival =
    r.arrivalMode === 'WINDOW' && r.windowStart && r.windowEnd
      ? `${ict(r.windowStart).format('D MMM YYYY')}, ${ict(r.windowStart).format('HH:mm')}–${ict(r.windowEnd).format('HH:mm')}`
      : 'Any time on the day';
  const horses = r.horses.map((h) => (h.withFoal ? `${h.name} (with foal)` : h.name)).join(', ');
  const flex = r.dateFlexDays === 3 ? ' · ±3 days' : '';
  const vet = r.vetEscort ? ' · veterinary escort' : '';
  return [
    { label: 'Horses', value: horses || dash, step: 'horses' },
    { label: 'Pickup', value: r.origin ? endpointLabel(r.origin) : dash, step: 'route' },
    { label: 'Route', value: via ? `${destination} · ${via}` : destination, step: 'route' },
    {
      label: 'Departure',
      value: r.departureDate ? `${formatDay(r.departureDate)}${flex}` : dash,
      step: 'route',
      mono: true,
    },
    { label: 'Arrival', value: arrival, step: 'route' },
    { label: 'Instructions', value: r.specialInstructions ?? 'None', step: 'route' },
    {
      label: 'Service',
      value: `${serviceWords(r.mode, r.trailer, r.airClass) ?? dash}${vet}`,
      step: 'service',
    },
    {
      label: 'Insurance',
      value: r.insurance ? INSURANCE_WORDS[r.insurance] : dash,
      step: 'service',
    },
  ];
};

/* ---------- small rules ---------- */

/** One groom per three horses, rounded up (AGENTS.md, Quotations). */
export const groomsFor = (count: number): number => Math.ceil(count / 3);

const STATUS: Record<RequestStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  SUBMITTED: { label: 'Submitted', tone: 'info' },
  UNDER_REVIEW: { label: 'Under review', tone: 'info' },
  INFO_REQUIRED: { label: 'Info required', tone: 'warn' },
  QUOTED: { label: 'Quoted', tone: 'info' },
  CUSTOMER_ACCEPTED: { label: 'Accepted', tone: 'ok' },
  APPROVED: { label: 'Approved', tone: 'ok' },
  REJECTED: { label: 'Rejected', tone: 'bad' },
  EXPIRED: { label: 'Expired', tone: 'neutral' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

/** A request's status in words and a tone. */
export const requestStatusChip = (s: RequestStatus): { label: string; tone: Tone } => STATUS[s];

/**
 * The pick cards: every active horse, then any horse already on the draft that is no longer active
 * (archived since), so the customer can see it and untick it.
 */
export const pickableHorses = (
  active: Horse[],
  onDraft: RequestHorse[],
): { id: string; horse: Horse | null; draft: RequestHorse | null }[] => {
  const byId = new Map(onDraft.map((h) => [h.horseId, h]));
  const rows: { id: string; horse: Horse | null; draft: RequestHorse | null }[] = active.map(
    (h) => ({ id: h.id, horse: h, draft: byId.get(h.id) ?? null }),
  );
  const shown = new Set(active.map((h) => h.id));
  for (const h of onDraft)
    if (!shown.has(h.horseId)) rows.push({ id: h.horseId, horse: null, draft: h });
  return rows;
};

/** A customer may change a draft, and a request returned for information (US-F1-04). */
export const editable = (status: RequestStatus): boolean =>
  status === 'DRAFT' || status === 'INFO_REQUIRED';

/** The latest submitted version; 0 for a draft. */
export const latestRevision = (r: TransportRequest): number =>
  r.revisions.reduce((n, v) => Math.max(n, v.revisionNo), 0);

/** "v1 · Submitted 26 Sep · returned 28 Sep", or "v2 · Submitted 30 Sep". */
export const versionLine = (v: RevisionSummary): string =>
  `v${v.revisionNo} · Submitted ${ict(v.submittedAt).format('D MMM')}` +
  (v.returnedAt ? ` · returned ${ict(v.returnedAt).format('D MMM')}` : '');

/** Review's primary: "Submit request", or "Send version 2" for a returned request. */
export const submitLabel = (r: TransportRequest): string =>
  r.status === 'INFO_REQUIRED' ? `Send version ${latestRevision(r) + 1}` : 'Submit request';

/**
 * The return itself bumps `updatedAt` a moment after the audit row that dates it, so a save counts as the
 * customer's only when it lands well after the return.
 */
const RETURN_SAVE_SLACK_MS = 5_000;

/** The wizard header's first sentence. */
export const savedLine = (r: TransportRequest): string => {
  if (r.status !== 'INFO_REQUIRED') return `Draft saved ${formatDate(r.updatedAt)}.`;
  const next = latestRevision(r) + 1;
  const returnedAt = r.revisions.findLast((v) => v.returnedAt)?.returnedAt;
  if (
    returnedAt &&
    new Date(r.updatedAt).getTime() - new Date(returnedAt).getTime() <= RETURN_SAVE_SLACK_MS
  )
    return `Returned ${formatDate(returnedAt)}. Send your answer as version ${next} from Review.`;
  return `Changes saved ${formatDate(r.updatedAt)}. Send them as version ${next} from Review.`;
};

/** The draft pass's chip: a returned request is waiting on the customer (spec §6.2, §6.3). */
export const passChip = (status: RequestStatus): { tone: Tone; label: string } =>
  status === 'INFO_REQUIRED'
    ? { tone: 'warn', label: 'Needs your answer' }
    : status === 'DRAFT'
      ? { tone: 'neutral', label: 'Draft' }
      : { tone: 'neutral', label: 'Submitted' };
