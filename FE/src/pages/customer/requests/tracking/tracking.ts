import type { RouteStripStop, Stage } from '@/components/ui';
import type { HistoryEntry, TransportRequest, TripRecord, TripStop, TripView } from '@/interfaces';
import { ON_THE_WAY, TripRecordKindEnum, TripStatusEnum } from '@/interfaces';
import { formatDate, formatTime, ict, spanUntil } from '@/lib/utils';

/** The records that place the horses on the route; a condition check or a note says nothing about where. */
const POSITION_KINDS = new Set<string>(
  Object.values(TripRecordKindEnum).filter(
    (k) => k !== TripRecordKindEnum.CONDITION_CHECK && k !== TripRecordKindEnum.NOTE,
  ),
);

/** Tracking replaces the request page once the horses have left; before that the documents lead. */
export const isTracking = (trip: TripView) =>
  trip.tripStatus !== TripStatusEnum.NOT_STARTED || trip.records.some((r) => r.kind !== 'NOTE');

export const delivered = (trip: TripView) => trip.tripStatus === TripStatusEnum.DELIVERED;

/** The move's stage: on the road it is Trip, from the delivery on it is Handover (DESIGN.md, Process Vocabulary). */
export const trackingStage = (trip: TripView): Stage => (delivered(trip) ? 'Handover' : 'Trip');

/** A stop's kind in the customer's words. A transfer is where one trip hands the horses to the next. */
export const stopKindLabel = (stop: TripStop) =>
  stop.kind === ON_THE_WAY
    ? 'On the way'
    : ({
        PICKUP: 'Pickup',
        BORDER: 'Border',
        WELFARE: 'Welfare stop',
        DELIVERY: 'Delivery',
        AIRPORT_OUT: 'Airport',
        AIRPORT_IN: 'Airport',
        QUARANTINE: 'Quarantine',
        REFUELLING: 'Refuelling',
        TRANSFER: 'Transfer',
      }[stop.kind] ?? 'Stop');

/** What a stop's last checkpoint says, in a word: "departed", "cleared", "handed on". */
const markWord = (stop: TripStop) => {
  switch (stop.latestStatus) {
    case 'LOADED':
    case 'DEPARTED':
    case 'LEFT_STOP':
    case 'FLIGHT_DEPARTED':
      return 'departed';
    case 'CLEARED_BORDER':
      return 'cleared';
    case 'HELD':
      return 'held';
    case 'DELIVERED':
      return stop.kind === 'TRANSFER' ? 'handed on' : 'delivered';
    case 'FLIGHT_LANDED':
      return 'landed';
    default:
      return 'arrived';
  }
};

/** The stops the horses have reached, from recorded checkpoints only: everything up to the last one with a mark. */
const reachedIndex = (trip: TripView) => {
  let reached = -1;
  trip.stops.forEach((s, i) => {
    if (s.latestStatus && POSITION_KINDS.has(s.latestStatus)) reached = i;
  });
  return reached;
};

/** The route as a strip of stops: done up to the last confirmed one, the next one current. */
export const routeStops = (trip: TripView): RouteStripStop[] => {
  const reached = reachedIndex(trip);
  const done = delivered(trip);
  return trip.stops.map((stop, i) => {
    const state = i <= reached || done ? 'done' : i === reached + 1 ? 'current' : 'upcoming';
    const time =
      state === 'done' && stop.latestOccurredAt
        ? `${formatTime(stop.latestOccurredAt)} · ${markWord(stop)}`
        : stop.plannedAt
          ? `exp. ${formatTime(stop.plannedAt)}`
          : '';
    return { name: stop.name, kind: stopKindLabel(stop), time, state };
  });
};

const lastPosition = (trip: TripView): TripRecord | undefined =>
  trip.records.filter((r) => POSITION_KINDS.has(r.kind)).at(-1);

/** The latest record of a kind; the records come oldest first. */
const last = (trip: TripView, kind: string) => trip.records.filter((r) => r.kind === kind).at(-1);

const inWindow = (trip: TripView, at: string) => {
  if (!trip.arrivalWindowStart || !trip.arrivalWindowEnd) return null;
  const t = ict(at);
  return !t.isBefore(ict(trip.arrivalWindowStart)) && !t.isAfter(ict(trip.arrivalWindowEnd));
};

export type PassStub = { label: string; value: string; sub: string };

/** The one thing the pass's stub says (DESIGN.md, The pass header). */
export const passStub = (trip: TripView, now: string): PassStub => {
  const arrivedAt = trip.handover?.deliveredAt ?? last(trip, 'DELIVERED')?.occurredAt;
  if (delivered(trip) && arrivedAt) {
    const kept = inWindow(trip, arrivedAt);
    return {
      label: 'Delivered',
      value: formatTime(arrivedAt),
      sub: `${ict(arrivedAt).format('D MMM')}${kept === null ? '' : kept ? ' · inside your window' : ' · after your window'}`,
    };
  }
  if (trip.tripStatus === TripStatusEnum.NOT_STARTED && trip.plannedDepartureAt)
    return {
      label: 'Departs in',
      value: spanUntil(trip.plannedDepartureAt, now),
      sub: `${formatDate(trip.plannedDepartureAt)} · ${formatTime(trip.plannedDepartureAt)}`,
    };
  if (!trip.plannedArrivalAt)
    return { label: 'On the road', value: '—', sub: 'Arrival to be planned' };
  const kept = inWindow(trip, trip.plannedArrivalAt);
  return {
    label: 'Arrives in about',
    value: spanUntil(trip.plannedArrivalAt, now),
    sub: `${formatTime(trip.plannedArrivalAt)}${kept ? ' · in your window' : ` · ${ict(trip.plannedArrivalAt).format('D MMM')}`}`,
  };
};

/** The sentence that leads the page while nothing is owed: where the horses were last confirmed, and what is next. */
export const whereNow = (trip: TripView): { body: string; next: TripStop | null } => {
  const reached = reachedIndex(trip);
  const next = trip.stops[reached + 1] ?? null;
  const at = lastPosition(trip);
  const stop = reached >= 0 ? trip.stops[reached] : undefined;
  const nextLine = next ? ` Next checkpoint: ${next.name}.` : '';
  if (trip.tripStatus === TripStatusEnum.HELD && stop)
    return {
      body: `Your horses are held at ${stop.name}${at ? ` since ${formatTime(at.occurredAt)}` : ''}. The logistics manager is deciding the next step and will tell you.`,
      next,
    };
  if (!stop || !stop.latestOccurredAt)
    return { body: `Your horses haven't left yet.${nextLine}`, next };
  const word = markWord(stop);
  const what =
    word === 'cleared'
      ? `cleared the ${stop.name} border`
      : word === 'handed on'
        ? `were handed on to the next trip at ${stop.name}`
        : word === 'departed'
          ? `left ${stop.name}`
          : word === 'landed'
            ? `landed at ${stop.name}`
            : `reached ${stop.name}`;
  return { body: `Your horses ${what} at ${formatTime(stop.latestOccurredAt)}.${nextLine}`, next };
};

export type StageRow = {
  state: 'done' | 'current' | 'upcoming';
  /** "Request, Quotation, Approval, Documents and Clearance": the stages it stands for. */
  title: string;
  body: string;
  deadline?: { left: string; date: string; tone?: 'info' | 'neutral' };
};

const DONE_BEFORE_TRIP = 'Request, Quotation, Approval, Documents and Clearance';

/** Where it stands (Figma, Tracking · In transit and Delivered): the stages behind folded into one row. */
export const stageRows = (trip: TripView, now: string): StageRow[] => {
  const departed = trip.records.find((r) => r.kind === 'DEPARTED' || r.kind === 'FLIGHT_DEPARTED');
  const arrivedAt = trip.handover?.deliveredAt ?? last(trip, 'DELIVERED')?.occurredAt ?? null;
  const handover = trip.handover;
  if (delivered(trip) && arrivedAt) {
    const late = handover?.lateMinutes;
    const answered = handover?.customerOutcome;
    return [
      {
        state: 'done',
        title: `${DONE_BEFORE_TRIP} and Trip`,
        body: `Done. Delivered at ${formatTime(arrivedAt)}${late ? `, ${late} minutes after plan` : ''}.`,
        deadline: { left: 'Done', date: ict(arrivedAt).format('D MMM') },
      },
      answered
        ? {
            state: 'done',
            title: 'Handover',
            body:
              answered === 'PROBLEM_REPORTED'
                ? 'You reported a problem; the logistics manager answers it.'
                : 'You accepted the handover.',
            deadline: handover?.confirmedAt
              ? { left: 'Done', date: ict(handover.confirmedAt).format('D MMM') }
              : undefined,
          }
        : {
            state: 'current',
            title: 'Handover',
            body: handover?.handedOverAt
              ? 'Confirm receipt and condition, or report a problem.'
              : 'The escort records the handover to your receiver.',
            deadline: handover?.confirmDueAt
              ? {
                  left: `Due in ${spanUntil(handover.confirmDueAt, now)}`,
                  date: ict(handover.confirmDueAt).format('D MMM'),
                  tone: 'info',
                }
              : undefined,
          },
    ];
  }
  const legs = trip.parts.length > 1 ? ` across ${trip.parts.length} trips` : '';
  return [
    {
      state: 'done',
      title: DONE_BEFORE_TRIP,
      body: trip.clearanceReady ? 'Done. Every document cleared; departure unlocked.' : 'Done.',
      deadline: departed
        ? { left: 'Done', date: ict(departed.occurredAt).format('D MMM') }
        : undefined,
    },
    {
      state: 'current',
      title: 'Trip',
      body: `${departed ? `On the road since ${formatTime(departed.occurredAt)}${legs}.` : 'Loading.'}${
        trip.arrivalWindowStart && trip.arrivalWindowEnd
          ? ` Planned to arrive inside your ${formatTime(trip.arrivalWindowStart)}–${formatTime(trip.arrivalWindowEnd)} window.`
          : ''
      }`,
      deadline: trip.plannedArrivalAt
        ? {
            left: `Arrives in about ${spanUntil(trip.plannedArrivalAt, now)}`,
            date: formatTime(trip.plannedArrivalAt),
            tone: 'info',
          }
        : undefined,
    },
    {
      state: 'upcoming',
      title: 'Handover',
      body: 'You confirm handover and condition on arrival.',
    },
  ];
};

/** What the grooms wrote about the horses, newest first: condition checks and notes with words in them. */
export const conditionLog = (trip: TripView) =>
  trip.records
    .filter((r) => r.text || r.conditions.length > 0)
    .filter((r) => r.kind !== TripRecordKindEnum.HANDED_OVER)
    .map((r) => ({
      id: r.id,
      at: r.occurredAt,
      by: r.recordedBy,
      text:
        r.text ??
        r.conditions
          .map((c) => `${c.horseName}: ${c.condition.toLowerCase()}${c.note ? `, ${c.note}` : ''}`)
          .join('. '),
    }))
    .reverse();

const EVENT: Partial<Record<string, (r: TripRecord) => string>> = {
  LOADED: (r) => `Loaded at ${r.checkpointName ?? 'the pickup'}.`,
  DEPARTED: (r) => `Departed ${r.checkpointName ?? 'the pickup'}.`,
  ARRIVED_AT_STOP: (r) => `Arrived at ${r.checkpointName ?? 'a checkpoint'}.`,
  CLEARED_BORDER: (r) => `Cleared the border at ${r.checkpointName ?? 'the crossing'}.`,
  HELD: (r) => `Held at ${r.checkpointName ?? 'a checkpoint'}.`,
  LEFT_STOP: (r) => `Left ${r.checkpointName ?? 'a checkpoint'}.`,
  ACCEPTED_BY_AIRLINE: (r) => `Accepted by the airline at ${r.checkpointName ?? 'the airport'}.`,
  FLIGHT_DEPARTED: () => 'The flight departed.',
  FLIGHT_LANDED: (r) => `The flight landed${r.checkpointName ? ` at ${r.checkpointName}` : ''}.`,
  RELEASED_BY_AIRLINE: () => 'Released by the airline.',
  DELIVERED: (r) => `Delivered at ${r.checkpointName ?? 'the destination'}.`,
  HANDED_OVER: () => 'Handed over to your receiver, with each horse’s condition.',
  CONDITION_CHECK: () => 'Condition check logged.',
};

/**
 * The move's history, newest first: the trip's checkpoints, then the request's own steps. A delivery at a
 * transfer hands the horses on to the next trip of the journey.
 */
export const tripHistory = (trip: TripView, request: TransportRequest): HistoryEntry[] => {
  const stopKind = new Map(trip.stops.map((s) => [s.id, s.kind]));
  const records: HistoryEntry[] = trip.records
    .filter((r) => r.kind !== TripRecordKindEnum.NOTE)
    .map((r) => ({
      occurredAt: r.occurredAt,
      summary:
        r.kind === 'DELIVERED' && r.routeStopId && stopKind.get(r.routeStopId) === 'TRANSFER'
          ? `Handed on to the next trip at ${r.checkpointName ?? 'the transfer'}.`
          : (EVENT[r.kind]?.(r) ?? 'Update recorded.'),
      actorLabel: r.recordedBy ?? 'The escort',
    }));
  const h = trip.handover;
  if (h?.confirmedAt && h.customerOutcome)
    records.push({
      occurredAt: h.confirmedAt,
      summary:
        h.customerOutcome === 'PROBLEM_REPORTED'
          ? `Problem reported with the handover: “${h.discrepancy ?? ''}”`
          : h.acceptedByDefault
            ? 'Handover taken as accepted: no answer by the due time.'
            : 'Handover accepted.',
      actorLabel: h.acceptedByDefault ? 'System' : (h.confirmedByName ?? 'You'),
    });
  return [...records, ...(request.history ?? [])].sort((a, b) =>
    b.occurredAt.localeCompare(a.occurredAt),
  );
};

/** The first border on the route, for the pass. */
export const firstBorder = (trip: TripView) =>
  trip.stops.find((s) => s.kind === 'BORDER')?.name ?? null;
