import type { IconName } from '@/components/ui';
import type { TripRecord, TripRecordKind, TripStop, TripView } from '@/interfaces';
import { ON_THE_WAY, RouteStopKindEnum, TripRecordKindEnum, TripStatusEnum } from '@/interfaces';
import { STOP_KINDS } from '@/pages/staff/jobs/ViewAddEdit/routeDraft';
import { formatTime, ict } from '@/lib/utils';

import { recordLabel } from '../tripFormat';

/*
 * Where the cab stands on its route, from recorded checkpoints only (DESIGN.md, Escort cab
 * surface): which stop it is at, what it can record there, and what the next stop is.
 */

export type StopState = 'done' | 'current' | 'held' | 'upcoming';

/** Records that close a stop: the trailer has left it, or its horses are handed on. */
const LEAVING = new Set<TripRecordKind>([
  TripRecordKindEnum.DEPARTED,
  TripRecordKindEnum.LEFT_STOP,
  TripRecordKindEnum.CLEARED_BORDER,
  TripRecordKindEnum.FLIGHT_DEPARTED,
  TripRecordKindEnum.RELEASED_BY_AIRLINE,
  TripRecordKindEnum.DELIVERED,
  TripRecordKindEnum.HANDED_OVER,
]);

export const stopKindLabel = (kind: TripStop['kind']) =>
  kind === ON_THE_WAY ? 'On the way' : (STOP_KINDS.find((k) => k.value === kind)?.label ?? kind);

/** "1 h 5 min", "45 min". */
export const durText = (minutes: number) => {
  const m = Math.abs(Math.round(minutes));
  const h = Math.floor(m / 60);
  const n = m % 60;
  return h ? `${h} h${n ? ` ${n} min` : ''}` : `${n} min`;
};

/** "6 min late", "on time", "4 min early", against the stop's planned time. */
export const againstPlan = (planned: string | null, recorded: string) => {
  if (!planned) return null;
  const late = ict(recorded).diff(ict(planned), 'minute');
  if (Math.abs(late) < 1) return 'on time';
  // A record far from its plan (a test, or a plan moved) says nothing useful against it.
  if (Math.abs(late) >= 12 * 60) return null;
  return late > 0 ? `${durText(late)} late` : `${durText(late)} early`;
};

/** A stop's last position record: what placed the trip there, and when. */
export type StopMark = { kind: TripRecordKind; at: string };

/** A condition check or a note says nothing about where the trip is (BE TripService.POSITION_KINDS). */
const NOT_POSITION = new Set<TripRecordKind>([
  TripRecordKindEnum.CONDITION_CHECK,
  TripRecordKindEnum.NOTE,
]);

const stopMarks = (trip: TripView): (StopMark | null)[] =>
  trip.stops.map((stop) => {
    const last = trip.records
      .filter((r) => r.routeStopId === stop.id && !NOT_POSITION.has(r.kind))
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
      .at(-1);
    return last ? { kind: last.kind, at: last.occurredAt } : null;
  });

export type CabPosition = {
  states: StopState[];
  /** Each stop's last position record, or null where none was recorded. */
  marks: (StopMark | null)[];
  /** The stop the cab is at, or -1 between stops. */
  at: number;
  /** The next stop to reach, or -1 once the route is done. */
  next: number;
};

export const cabPosition = (trip: TripView): CabPosition => {
  const { stops } = trip;
  const marks = stopMarks(trip);
  let reached = -1;
  marks.forEach((mark, i) => {
    if (mark) reached = i;
  });
  const held = trip.tripStatus === TripStatusEnum.HELD;
  // Not departed yet: the cab is at the pickup.
  if (reached < 0 && trip.tripStatus === TripStatusEnum.NOT_STARTED) {
    return {
      states: stops.map((_, i) => (i === 0 ? 'current' : 'upcoming')),
      marks,
      at: stops.length ? 0 : -1,
      next: stops.length > 1 ? 1 : -1,
    };
  }
  // A departure recorded without its stop has left the first one.
  if (reached < 0) reached = 0;
  const mark = marks[reached];
  const finalDelivery =
    mark?.kind === TripRecordKindEnum.DELIVERED &&
    stops[reached]?.kind === RouteStopKindEnum.DELIVERY &&
    !trip.handover?.handedOverAt;
  const left = mark ? LEAVING.has(mark.kind) && !finalDelivery : true;
  const at = left ? -1 : reached;
  const next = reached + 1 < stops.length ? reached + 1 : -1;
  return {
    states: stops.map((_, i) => {
      if (i < reached || (i === reached && left)) return 'done';
      if (i === reached) return held ? 'held' : 'current';
      return 'upcoming';
    }),
    marks,
    at,
    next,
  };
};

export type StopCell = { name: string; kind: string; time: string; note: string };

export const stopCell = (
  stop: TripStop,
  mark: StopMark | null,
  state: StopState,
  afterHold: boolean,
): StopCell => {
  const recorded = mark?.at;
  // The cell is short: "Arrived · 6 min late", not the log's "Arrived at checkpoint".
  const label = !mark
    ? null
    : mark.kind === TripRecordKindEnum.ARRIVED_AT_STOP
      ? 'Arrived'
      : recordLabel(mark.kind, stop.kind);
  const planned = stop.plannedAt ? formatTime(stop.plannedAt) : '—';
  const base = { name: stop.name, kind: stopKindLabel(stop.kind) };
  if (state === 'done')
    return { ...base, time: recorded ? formatTime(recorded) : planned, note: label ?? 'Passed' };
  if (state === 'held')
    return { ...base, time: recorded ? formatTime(recorded) : planned, note: 'Held since' };
  if (state === 'current') {
    if (!recorded || !label) return { ...base, time: planned, note: 'Recording now' };
    const delta = againstPlan(stop.plannedAt, recorded);
    return { ...base, time: formatTime(recorded), note: delta ? `${label} · ${delta}` : label };
  }
  return {
    ...base,
    time: afterHold ? '—' : planned,
    note: afterHold ? 'Waits on the decision' : 'Planned',
  };
};

export type Outcome = {
  kind: TripRecordKind;
  title: string;
  /** The gold action's word, when the title is too long for it: "Record: arrived at 09:36". */
  verb?: string;
  description: string;
  /** What saving it does, said on the option card. */
  meta: string;
  icon: IconName;
  /** Why it can't be recorded yet; the card stays readable and disabled. */
  blocked?: string;
};

const sees = (title: string) => `The customer sees “${title}”`;

const held = (where: string): Outcome => ({
  kind: TripRecordKindEnum.HELD,
  title: 'Held',
  description: `The load is stopped ${where} and can’t go on yet.`,
  meta: 'Alerts the logistics manager when you save',
  icon: 'alert',
});

const note: Outcome = {
  kind: TripRecordKindEnum.NOTE,
  title: 'Just a note',
  description: 'Nothing changed on the road; a note for the office.',
  meta: 'Doesn’t move the trip on the customer’s page',
  icon: 'pencil',
};

/** What the cab can record next, where it stands: the likely outcome first. */
export const outcomes = (trip: TripView, position: CabPosition): Outcome[] => {
  const { stops } = trip;
  const recorded = (kind: TripRecordKind) => trip.records.some((r) => r.kind === kind);
  if (trip.tripStatus === TripStatusEnum.NOT_STARTED) {
    const depart: Outcome = {
      kind: TripRecordKindEnum.DEPARTED,
      title: 'Departed',
      description: 'The horses are loaded and the trailer is leaving the pickup.',
      meta: sees('Departed'),
      icon: 'truck',
      blocked: trip.clearanceReady
        ? undefined
        : 'Opens once the transport specialist clears the dossier',
    };
    if (recorded(TripRecordKindEnum.LOADED)) return [depart, note];
    return [
      {
        kind: TripRecordKindEnum.LOADED,
        title: 'Loaded',
        description: 'Every horse is in its stall and the ramp is up.',
        meta: sees('Loaded'),
        icon: 'check',
      },
      depart,
      note,
    ];
  }
  const stop = position.at >= 0 ? stops[position.at] : undefined;
  if (!stop) {
    const next = position.next >= 0 ? stops[position.next] : undefined;
    if (!next) return [note];
    const arrival: Outcome =
      next.kind === RouteStopKindEnum.AIRPORT_IN
        ? {
            kind: TripRecordKindEnum.FLIGHT_LANDED,
            title: 'Flight landed',
            description: `The flight is down at ${next.name}.`,
            meta: sees('Flight landed'),
            icon: 'plane',
          }
        : {
            kind: TripRecordKindEnum.ARRIVED_AT_STOP,
            title: `Arrived at ${next.name}`,
            verb: 'arrived',
            description: `${stopKindLabel(next.kind)}. Record it when the trailer stops there.`,
            meta: sees('Arrived'),
            icon: 'pin',
          };
    return [arrival, held('on the road'), note];
  }
  switch (stop.kind) {
    case RouteStopKindEnum.BORDER:
      return [
        {
          kind: TripRecordKindEnum.CLEARED_BORDER,
          title: 'Cleared',
          description: 'Both border posts stamped the papers and the trip goes on.',
          meta: sees('Customs cleared'),
          icon: 'check',
        },
        held('at the border'),
        note,
      ];
    case RouteStopKindEnum.AIRPORT_OUT:
      return [
        ...(recorded(TripRecordKindEnum.ACCEPTED_BY_AIRLINE)
          ? []
          : [
              {
                kind: TripRecordKindEnum.ACCEPTED_BY_AIRLINE,
                title: 'Accepted by the airline',
                description: 'The airline has taken the horses into its care.',
                meta: sees('Accepted by airline'),
                icon: 'check' as IconName,
              },
            ]),
        {
          kind: TripRecordKindEnum.FLIGHT_DEPARTED,
          title: 'Flight departed',
          description: 'The aircraft is off the stand with the horses on board.',
          meta: sees('Flight departed'),
          icon: 'plane',
        },
        held('at the airport'),
        note,
      ];
    case RouteStopKindEnum.AIRPORT_IN:
      return [
        {
          kind: TripRecordKindEnum.RELEASED_BY_AIRLINE,
          title: 'Released by the airline',
          description: 'The horses are back in your care and loaded on the trailer.',
          meta: sees('Released by airline'),
          icon: 'check',
        },
        held('at the airport'),
        note,
      ];
    case RouteStopKindEnum.DELIVERY:
    case RouteStopKindEnum.TRANSFER: {
      const title = recordLabel(TripRecordKindEnum.DELIVERED, stop.kind);
      return [
        {
          kind: TripRecordKindEnum.DELIVERED,
          title,
          description:
            stop.kind === RouteStopKindEnum.TRANSFER
              ? 'The next trip’s crew has the horses.'
              : 'The trailer is at the destination; the handover comes next.',
          meta: sees(title),
          icon: 'check',
        },
        held('here'),
        note,
      ];
    }
    default:
      return [
        {
          kind: TripRecordKindEnum.LEFT_STOP,
          title: `Left ${stop.name}`,
          verb: 'left',
          description: 'The trailer is back on the road.',
          meta: sees('Left checkpoint'),
          icon: 'truck',
        },
        held('here'),
        note,
      ];
  }
};

/** The stop a record belongs to: the stop the cab is at, or the one it's arriving at. */
export const recordStop = (
  trip: TripView,
  position: CabPosition,
  kind: TripRecordKind,
): string | null => {
  if (kind === TripRecordKindEnum.NOTE) return null;
  if (position.at >= 0) return trip.stops[position.at]?.id ?? null;
  // Between stops a hold or a check happens on the road, not at the next stop.
  if (kind === TripRecordKindEnum.HELD || kind === TripRecordKindEnum.CONDITION_CHECK) return null;
  return position.next >= 0 ? (trip.stops[position.next]?.id ?? null) : null;
};

/** The last record of a kind, newest first. */
export const lastRecord = (trip: TripView, kind: TripRecordKind): TripRecord | undefined =>
  trip.records
    .filter((r) => r.kind === kind)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];

/** Horses may rest on the trailer for at most this long before they are unloaded (DESIGN.md, Held). */
export const REST_EVERY_HOURS = 6;
