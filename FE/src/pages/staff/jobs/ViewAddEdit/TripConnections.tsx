import type { FC } from 'react';

import { connection } from './timeline';

import { Callout } from '@/components/ui';
import type { JobDetail, TripPart } from '@/interfaces';

/**
 * A hand-on with too little time before the next trip leaves, said on both trips (US-F3-16): the horses are
 * unloaded, checked and loaded again in between.
 */
function ConnectionCallout({
  from,
  to,
  side,
}: {
  from: TripPart;
  to: TripPart;
  side: 'in' | 'out';
}) {
  const c = connection(from, to);
  if (!c || c.tone === 'ok') return null;
  const title =
    side === 'in'
      ? c.minutes < 0
        ? `This trip leaves before ${from.tripCode} hands the horses on: it ${c.gap}`
        : `Tight connection: this trip leaves ${c.gap} after ${from.tripCode} hands the horses on`
      : c.minutes < 0
        ? `${to.tripCode} leaves before this trip hands the horses on: it ${c.gap}`
        : `Tight connection: ${to.tripCode} leaves ${c.gap} after this trip hands the horses on`;
  return (
    <Callout tone={c.tone} title={title}>
      The horses are unloaded, checked and loaded again in between. Move{' '}
      {side === 'in' ? 'this trip’s departure' : 'this trip’s arrival'} or{' '}
      {side === 'in' ? `${from.tripCode}’s arrival` : `${to.tripCode}’s departure`} so there is at
      least an hour.
    </Callout>
  );
}

/** The connections into and out of the trip shown, on a road trip's Route view and on a flight alike. */
export const TripConnections: FC<{ job: JobDetail }> = ({ job }) => {
  const index = job.parts.findIndex((p) => p.current);
  const part = index < 0 ? null : job.parts[index];
  if (!part) return null;
  const before = index > 0 ? job.parts[index - 1] : null;
  const after = part.handsOn ? (job.parts[index + 1] ?? null) : null;
  return (
    <>
      {before && <ConnectionCallout from={before} to={part} side="in" />}
      {after && <ConnectionCallout from={part} to={after} side="out" />}
    </>
  );
};
