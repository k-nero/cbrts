import type { FC } from 'react';

import { lastRecord, neighbourParts } from './cabState';
import { TaskHead } from './TaskHead';

import { Callout, Panel } from '@/components/ui';
import type { TripView } from '@/interfaces';
import { TripRecordKindEnum } from '@/interfaces';
import { formatTime } from '@/lib/utils';

/**
 * Handed on (US-F3-16): the trip is one leg of the journey and its delivery at the transfer handed
 * the horses to the next trip. The handover to the receiver is recorded on the last trip, so this
 * one has nothing left to record.
 */
export const HandedOnTask: FC<{ trip: TripView }> = ({ trip }) => {
  const { next } = neighbourParts(trip);
  const delivered = lastRecord(trip, TripRecordKindEnum.DELIVERED);
  const where = trip.stops.at(-1)?.name;
  const to = next?.tripCode ?? 'the next trip';
  return (
    <Panel flush>
      <TaskHead
        title={`Handed on to ${to}`}
        sub={
          delivered
            ? `You recorded the delivery${where ? ` at ${where}` : ''} at ${formatTime(delivered.occurredAt)}.`
            : 'The horses are with the next trip of the journey.'
        }
      />
      <div className="px-6 pt-1 pb-6">
        <Callout tone="info" title="Nothing left to record on this trip">
          {to} takes the horses on from here, and the handover to the receiver is recorded at the
          delivery on the last trip.
        </Callout>
      </div>
    </Panel>
  );
};
