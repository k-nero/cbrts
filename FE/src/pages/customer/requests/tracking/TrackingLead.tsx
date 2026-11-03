import type { FC } from 'react';

import { delivered, whereNow } from './tracking';
import { NothingOwed } from '../../home/NothingOwed';

import { HandoverAnswer } from '@/pages/trip/HandoverAnswer';
import type { NextEvent, TripView } from '@/interfaces';
import { formatTime } from '@/lib/utils';

/**
 * The lead block (DESIGN.md, Home states; Figma "Tracking · In transit", "Delivered"): on the road nothing is
 * owed and the last confirmed checkpoint leads with the next one stated twice; once the horses are handed
 * over, confirming the handover is the one owed item.
 */
export const TrackingLead: FC<{ trip: TripView; now: string }> = ({ trip, now }) => {
  const handover = trip.handover;
  if (handover?.handedOverAt && !handover.customerOutcome && handover.confirmDueAt)
    return <HandoverAnswer trip={trip} />;
  let event: NextEvent;
  if (delivered(trip)) {
    const at = handover?.deliveredAt;
    event = {
      title: 'Nothing needed from you',
      body: handover?.customerOutcome
        ? handover.customerOutcome === 'PROBLEM_REPORTED'
          ? 'You reported a problem with the handover. The logistics manager answers it here.'
          : `You accepted the handover${handover.acceptedByDefault ? ' by default' : ''}. Nothing more happens on this move.`
        : `Your horses arrived${at ? ` at ${formatTime(at)}` : ''}. The escort is handing them over to your receiver.`,
      verb: '',
      at: null,
      dateStyle: 'time',
    };
  } else {
    const { body, next } = whereNow(trip);
    event = {
      title: 'Nothing needed from you',
      body,
      verb: 'Expected',
      at: next?.plannedAt ?? null,
      dateStyle: 'dayTime',
    };
  }
  return <NothingOwed event={event} asOf={now} />;
};
