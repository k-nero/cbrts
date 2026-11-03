import { type FC, useState } from 'react';

import { CabBar } from './CabBar';
import { CabStrip } from './CabStrip';
import { CheckpointTask } from './CheckpointTask';
import { ConditionTask } from './ConditionTask';
import { HandedOnTask } from './HandedOnTask';
import { HandoverTask } from './HandoverTask';
import { HeldTask } from './HeldTask';
import { cabPosition, departureBlocked, neighbourParts } from './cabState';

import { HandoverRecord } from '../HandoverRecord';
import { ReportEmergency } from '../ReportEmergency';

import type { Tone } from '@/components/ui';
import type { TripSummary, TripView } from '@/interfaces';
import { RouteStopKindEnum, TripRecordKindEnum, TripStatusEnum } from '@/interfaces';
import { formatTime } from '@/lib/utils';

type Props = {
  trip: TripView;
  trips: TripSummary[];
  selected: string;
  onSelect: (key: string) => void;
};

/** The state that matters now, as a tone and a word, for the cab bar. */
const cabState = (trip: TripView): { tone: Tone; word: string } => {
  const held = trip.records.filter((r) => r.kind === TripRecordKindEnum.HELD).at(-1);
  switch (trip.tripStatus) {
    case TripStatusEnum.NOT_STARTED: {
      const previous = neighbourParts(trip).previous;
      if (previous && previous.status !== TripStatusEnum.DELIVERED)
        return { tone: 'warn', word: `Waiting for ${previous.tripCode ?? 'the trip before'}` };
      return departureBlocked(trip)
        ? { tone: 'warn', word: 'Waiting for clearance' }
        : { tone: 'ok', word: 'Clear to depart' };
    }
    case TripStatusEnum.HELD:
      return {
        tone: 'bad',
        word: held?.checkpointName ? `Held at ${held.checkpointName}` : 'Held',
      };
    case TripStatusEnum.DELIVERED:
      if (neighbourParts(trip).handsOn) return { tone: 'ok', word: 'Handed on' };
      if (trip.handover?.handedOverAt) return { tone: 'ok', word: 'Handed over' };
      return trip.handover?.deliveredAt
        ? { tone: 'ok', word: `Arrived ${formatTime(trip.handover.deliveredAt)}` }
        : { tone: 'ok', word: 'Arrived' };
    default:
      return { tone: 'ok', word: 'On the road' };
  }
};

/**
 * The escort's cab surface (DESIGN.md, Escort cab surface; Figma "Escort · Checkpoint", "Welfare
 * stop", "Delivery", "Held"): one bar of context, the route as stop cells, the task first, and the
 * dock with the one gold action. The task follows where the trip stands.
 */
export const CabSurface: FC<Props> = ({ trip, trips, selected, onSelect }) => {
  const position = cabPosition(trip);
  const tripCode = trip.tripCode ?? undefined;
  const stop = position.at >= 0 ? trip.stops[position.at] : undefined;
  // At a welfare stop the task is the condition log, until it is saved there.
  const welfare =
    stop?.kind === RouteStopKindEnum.WELFARE &&
    !trip.records.some(
      (r) => r.routeStopId === stop.id && r.kind === TripRecordKindEnum.CONDITION_CHECK,
    );
  const [logging, setLogging] = useState<boolean>();
  const condition = logging ?? welfare;

  const delivered = trip.tripStatus === TripStatusEnum.DELIVERED;
  const handedOver = Boolean(trip.handover?.handedOverAt);
  // A leg that ends at a transfer hands the horses on; the receiver's handover is on the last trip.
  const handedOn = delivered && neighbourParts(trip).handsOn;
  const part = trip.parts.find((p) => p.current);
  const route =
    part?.startCity && part.endCity
      ? `${part.startCity} → ${part.endCity}`
      : `${trip.stops[0]?.name ?? trip.origin ?? 'Origin'} → ${trip.stops.at(-1)?.name ?? trip.destination ?? 'Destination'}`;
  const emergency = !handedOver && !handedOn && <ReportEmergency trip={trip} />;

  return (
    <>
      <CabBar
        trips={trips}
        selected={selected}
        onSelect={onSelect}
        route={route}
        stage={delivered && !handedOn ? 'Handover' : 'Trip'}
        state={cabState(trip)}
      />
      {trip.stops.length > 0 && <CabStrip trip={trip} position={position} />}
      {handedOn ? (
        <HandedOnTask trip={trip} />
      ) : handedOver ? (
        <HandoverRecord trip={trip} />
      ) : delivered ? (
        <HandoverTask trip={trip} tripCode={tripCode} extra={emergency} />
      ) : condition ? (
        <ConditionTask
          trip={trip}
          tripCode={tripCode}
          position={position}
          extra={emergency}
          onBack={welfare && logging === undefined ? undefined : () => setLogging(false)}
        />
      ) : trip.tripStatus === TripStatusEnum.HELD ? (
        <HeldTask trip={trip} extra={emergency} onLogCondition={() => setLogging(true)} />
      ) : (
        <CheckpointTask
          key={`${position.at}:${position.next}:${trip.records.length}`}
          trip={trip}
          tripCode={tripCode}
          position={position}
          extra={emergency}
          onLogCondition={() => setLogging(true)}
        />
      )}
    </>
  );
};
