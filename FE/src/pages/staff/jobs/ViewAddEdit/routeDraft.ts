import dayjs from 'dayjs';
import { z } from 'zod';

import type { JobDetail, RouteDraftInput, RoutePlan, RouteStopKind } from '@/interfaces';
import { formatDayTime } from '@/lib/utils';

/** The editor's date-time value, in the browser's local time (as the vehicle booking form). */
export const LOCAL_DATETIME = 'YYYY-MM-DDTHH:mm';
const SHOWN = 'D MMM, HH:mm';

/** When the horses leave a stop: its planned time plus its stay. */
const leavesAt = (at: dayjs.Dayjs, stayMin: number | null | undefined) =>
  stayMin ? at.add(stayMin, 'minute') : at;

/** The stop kinds a coordinator plans, in the order they usually come (US-F3-17). */
export const STOP_KINDS: { value: RouteStopKind; label: string }[] = [
  { value: 'PICKUP', label: 'Pickup' },
  { value: 'BORDER', label: 'Border crossing' },
  { value: 'WELFARE', label: 'Welfare stop' },
  { value: 'REFUELLING', label: 'Refuelling' },
  { value: 'AIRPORT_OUT', label: 'Airport departure' },
  { value: 'AIRPORT_IN', label: 'Airport arrival' },
  { value: 'QUARANTINE', label: 'Quarantine' },
  { value: 'TRANSFER', label: 'Hand on to the next trip' },
  { value: 'DELIVERY', label: 'Delivery' },
];

export const MODES = [
  { value: 'ROAD', label: 'Road' },
  { value: 'AIR', label: 'Air' },
];

const option = z.object({ label: z.string(), value: z.string() });

/** One stop of the draft. A pickup, delivery or transfer keeps the job it is for (another job's, on a shared trip). */
const stopSchema = z
  .object({
    kind: option,
    jobId: z.string().nullable(),
    place: option.nullable(),
    crossing: option.nullable(),
    plannedAt: z.string(),
    stayMin: z.number().int().min(0, 'Not negative.').nullable(),
    details: z.string().trim().max(500, 'At most 500 characters.'),
  })
  .superRefine((s, ctx) => {
    if (s.kind.value === 'BORDER' && !s.crossing)
      ctx.addIssue({ code: 'custom', path: ['crossing'], message: 'Choose the crossing.' });
    if (s.kind.value !== 'BORDER' && !s.place)
      ctx.addIssue({ code: 'custom', path: ['place'], message: 'Choose the place.' });
  });

/** The leg from one stop to the next; an air leg names its flight. */
const legSchema = z
  .object({
    mode: option,
    vehicleId: z.string().nullable(),
    distanceKm: z.number().int().min(0, 'Not negative.').nullable(),
    plannedMin: z.number().int().min(0, 'Not negative.').nullable(),
    airline: z.string().trim().max(80),
    flightNo: z.string().trim().max(12),
    stallCapacity: z.number().int().min(1, 'At least one.').nullable(),
    departsAt: z.string(),
    arrivesAt: z.string(),
  })
  .superRefine((l, ctx) => {
    if (l.mode.value !== 'AIR') return;
    if (!l.airline)
      ctx.addIssue({ code: 'custom', path: ['airline'], message: 'Enter the airline.' });
    if (!l.flightNo)
      ctx.addIssue({ code: 'custom', path: ['flightNo'], message: 'Enter the flight number.' });
  });

export const routeDraftSchema = z
  .object({
    stops: z.array(stopSchema).min(2, 'A route has at least a pickup and a delivery.'),
    legs: z.array(legSchema),
    changeReason: z.string().trim().max(500),
  })
  .superRefine((r, ctx) => {
    // The times run forward: a stop is planned no earlier than the horses leave the timed stop before it (the server
    // refuses the same). An untimed stop is skipped, so the route can be timed bit by bit.
    let before: { no: number; leaves: dayjs.Dayjs } | null = null;
    for (const [i, s] of r.stops.entries()) {
      if (!s.plannedAt) continue;
      const at = dayjs(s.plannedAt);
      if (before && at.isBefore(before.leaves))
        ctx.addIssue({
          code: 'custom',
          path: ['stops', i, 'plannedAt'],
          message: `Before the horses leave stop ${before.no} at ${before.leaves.format(SHOWN)}. Plan it later, or recalculate the times.`,
        });
      before = { no: i + 1, leaves: leavesAt(at, s.stayMin) };
    }
    const last = r.stops.at(-1)?.kind.value;
    if (r.stops[0]?.kind.value !== 'PICKUP')
      ctx.addIssue({
        code: 'custom',
        path: ['stops', 0, 'kind'],
        message: 'A route starts with a pickup.',
      });
    if (last !== 'DELIVERY' && last !== 'TRANSFER')
      ctx.addIssue({
        code: 'custom',
        path: ['stops', r.stops.length - 1, 'kind'],
        message: 'A route ends with a delivery or a hand-on.',
      });
  });
export type RouteDraftForm = z.infer<typeof routeDraftSchema>;
export type StopForm = RouteDraftForm['stops'][number];
export type LegForm = RouteDraftForm['legs'][number];

const kindOption = (kind: RouteStopKind) =>
  STOP_KINDS.find((k) => k.value === kind) ?? { value: kind, label: kind };

const local = (iso?: string | null) => (iso ? dayjs(iso).format(LOCAL_DATETIME) : '');
const iso = (value: string) => (value ? dayjs(value).toISOString() : null);

export const emptyLeg = (): LegForm => ({
  mode: MODES[0],
  vehicleId: null,
  distanceKm: null,
  plannedMin: null,
  airline: '',
  flightNo: '',
  stallCapacity: null,
  departsAt: '',
  arrivesAt: '',
});

export const emptyStop = (kind: RouteStopKind): StopForm => ({
  kind: kindOption(kind),
  jobId: null,
  place: null,
  crossing: null,
  plannedAt: '',
  stayMin: null,
  details: '',
});

/**
 * The editor's starting point: the trip's draft or confirmed route as it is, else a pickup at the job's origin and a
 * delivery at its destination.
 */
export const toForm = (plan: RoutePlan | null | undefined, job: JobDetail): RouteDraftForm => {
  if (!plan || plan.stops.length === 0) {
    const place = (p?: { id: string; name: string } | null) =>
      p ? { value: p.id, label: p.name } : null;
    return {
      stops: [
        { ...emptyStop('PICKUP'), jobId: job.id, place: place(job.originPlace) },
        { ...emptyStop('DELIVERY'), jobId: job.id, place: place(job.destinationPlace) },
      ],
      legs: [emptyLeg()],
      changeReason: '',
    };
  }
  const stops = [...plan.stops].sort((a, b) => a.seq - b.seq);
  return {
    stops: stops.map((s) => ({
      kind: kindOption(s.kind),
      jobId: s.jobId ?? null,
      place: s.placeId ? { value: s.placeId, label: s.placeName ?? 'Place' } : null,
      crossing: s.borderCrossingId
        ? { value: s.borderCrossingId, label: s.borderCrossingName ?? 'Crossing' }
        : null,
      plannedAt: local(s.plannedAt),
      stayMin: s.plannedStayMin ?? null,
      details: s.details ?? '',
    })),
    // One leg between each pair of stops, as the route has it; a missing one is a road leg to plan.
    legs: stops.slice(1).map((to, i) => {
      const leg = plan.legs.find((l) => l.fromStopId === stops[i].id && l.toStopId === to.id);
      if (!leg) return emptyLeg();
      return {
        mode: MODES.find((m) => m.value === leg.mode) ?? MODES[0],
        vehicleId: leg.vehicleId ?? null,
        distanceKm: leg.distanceKm ?? null,
        plannedMin: leg.plannedMin ?? null,
        airline: leg.flight?.airline ?? '',
        flightNo: leg.flight?.flightNo ?? '',
        stallCapacity: leg.flight?.stallCapacity ?? null,
        departsAt: local(leg.flight?.scheduledDepartureAt),
        arrivesAt: local(leg.flight?.scheduledArrivalAt),
      };
    }),
    changeReason: '',
  };
};

const NAMES_JOB: RouteStopKind[] = ['PICKUP', 'DELIVERY', 'TRANSFER'];

/**
 * The route's totals for its summary strip: the legs' distances added up, and the time from the first planned stop to
 * the last (else the legs' times and the stays between them). Null when nothing is known.
 */
export const totals = (form: RouteDraftForm) => {
  const legs = form.legs.slice(0, Math.max(form.stops.length - 1, 0));
  const km = legs.map((l) => l.distanceKm).filter((d): d is number => d != null);
  const first = form.stops[0]?.plannedAt;
  const last = form.stops.at(-1)?.plannedAt;
  const span = first && last ? dayjs(last).diff(dayjs(first), 'minute') : null;
  const moving = legs.map((l) => l.plannedMin).filter((m): m is number => m != null);
  const stays = form.stops
    .slice(0, -1)
    .map((s) => s.stayMin)
    .filter((m): m is number => m != null);
  return {
    distanceKm: km.length > 0 ? km.reduce((a, b) => a + b, 0) : null,
    durationMin:
      span != null && span > 0
        ? span
        : moving.length > 0
          ? [...moving, ...stays].reduce((a, b) => a + b, 0)
          : null,
  };
};

/** What the draft endpoint takes: stops numbered from 1, and a leg from each stop to the next. */
export const toInput = (form: RouteDraftForm, job: JobDetail): RouteDraftInput => ({
  ...totals(form),
  changeReason: form.changeReason || undefined,
  stops: form.stops.map((s, i) => {
    const kind = s.kind.value as RouteStopKind;
    return {
      seq: i + 1,
      kind,
      // A new pickup, delivery or hand-on is this job's; one already on the route keeps its own job.
      jobId: NAMES_JOB.includes(kind) ? (s.jobId ?? job.id) : null,
      placeId: kind === 'BORDER' ? null : (s.place?.value ?? null),
      borderCrossingId: kind === 'BORDER' ? (s.crossing?.value ?? null) : null,
      plannedAt: iso(s.plannedAt),
      plannedStayMin: s.stayMin,
      details: s.details || null,
    };
  }),
  legs: form.stops.slice(1).map((_, i) => {
    const leg = form.legs[i] ?? emptyLeg();
    const air = leg.mode.value === 'AIR';
    return {
      seq: i + 1,
      fromStopSeq: i + 1,
      toStopSeq: i + 2,
      mode: air ? 'AIR' : 'ROAD',
      vehicleId: air ? null : leg.vehicleId,
      distanceKm: leg.distanceKm,
      plannedMin: leg.plannedMin,
      flight: air
        ? {
            airline: leg.airline,
            flightNo: leg.flightNo,
            stallCapacity: leg.stallCapacity,
            scheduledDepartureAt: iso(leg.departsAt),
            scheduledArrivalAt: iso(leg.arrivesAt),
          }
        : null,
    };
  }),
});

/**
 * The stops' planned times worked out from the departure (the first stop's time): each stop is the one before plus
 * its stay and the leg's time. They stop at the first leg with no time, which `missingLeg` names (from 1); null when
 * the first stop has no time yet.
 */
export const recalculatedTimes = (
  form: Pick<RouteDraftForm, 'stops' | 'legs'>,
): { times: string[]; missingLeg: number | null } | null => {
  const start = form.stops[0]?.plannedAt;
  if (!start) return null;
  const times = [start];
  let at = dayjs(start);
  for (let i = 1; i < form.stops.length; i++) {
    const legMin = form.legs[i - 1]?.plannedMin;
    if (legMin == null) {
      return { times: [...times, ...form.stops.slice(i).map((s) => s.plannedAt)], missingLeg: i };
    }
    at = leavesAt(at, form.stops[i - 1].stayMin).add(legMin, 'minute');
    times.push(at.format(LOCAL_DATETIME));
  }
  return { times, missingLeg: null };
};

/** One check a route passes before it is confirmed; `blocks` when the server would refuse the route. */
export interface RouteCheck {
  key: string;
  ok: boolean;
  blocks: boolean;
  label: string;
}

/**
 * The checks shown above Confirm, the ones the server runs when the route is confirmed: the times run forward, the
 * drive has its welfare stops, and the job's delivery is inside its arrival window. Stops with no time yet are a
 * warning only.
 */
export const routeChecks = (plan: RoutePlan, job: JobDetail): RouteCheck[] => {
  const stops = [...plan.stops].sort((a, b) => a.seq - b.seq);
  const checks: RouteCheck[] = [];

  let before: { no: number; leaves: dayjs.Dayjs } | null = null;
  let backwards: string | null = null;
  for (const [i, s] of stops.entries()) {
    if (!s.plannedAt) continue;
    const at = dayjs(s.plannedAt);
    if (before && at.isBefore(before.leaves)) {
      backwards = `Stop ${i + 1} is planned at ${formatDayTime(s.plannedAt)}, before the horses leave stop ${before.no} at ${formatDayTime(before.leaves.toISOString())}.`;
      break;
    }
    before = { no: i + 1, leaves: leavesAt(at, s.plannedStayMin) };
  }
  checks.push({
    key: 'order',
    ok: backwards === null,
    blocks: true,
    label: backwards ?? 'The times run in order, stays included.',
  });

  const untimed = stops.filter((s) => !s.plannedAt).length;
  if (untimed > 0)
    checks.push({
      key: 'untimed',
      ok: false,
      blocks: false,
      label: `${untimed} ${untimed === 1 ? 'stop has' : 'stops have'} no planned time yet.`,
    });

  const needed = plan.welfareStopsNeeded ?? 0;
  const welfare = stops.filter((s) => s.kind === 'WELFARE').length;
  checks.push({
    key: 'welfare',
    ok: welfare >= needed,
    blocks: true,
    label:
      needed === 0
        ? `${welfare} welfare ${welfare === 1 ? 'stop' : 'stops'}; this drive needs none.`
        : `${welfare} of the ${needed} welfare ${needed === 1 ? 'stop' : 'stops'} the drive needs.`,
  });

  const delivery = stops.find(
    (s) => s.kind === 'DELIVERY' && (s.jobId == null || s.jobId === job.id) && s.plannedAt,
  );
  if (job.windowEnd && delivery?.plannedAt) {
    const late = dayjs(delivery.plannedAt).isAfter(dayjs(job.windowEnd));
    checks.push({
      key: 'window',
      ok: !late,
      blocks: true,
      label: late
        ? `The delivery at ${formatDayTime(delivery.plannedAt)} is after the arrival window closes at ${formatDayTime(job.windowEnd)}.`
        : `The delivery at ${formatDayTime(delivery.plannedAt)} is inside the arrival window.`,
    });
  }
  return checks;
};
