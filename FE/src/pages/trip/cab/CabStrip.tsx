import type { FC } from 'react';

import { StopCell } from './StopCell';
import { type CabPosition, stopCell } from './cabState';

import type { TripView } from '@/interfaces';

/** The route as large stop cells, in order. */
export const CabStrip: FC<{ trip: TripView; position: CabPosition }> = ({ trip, position }) => {
  const heldAt = position.states.indexOf('held');
  return (
    <ol aria-label="Route" className="m-0 flex list-none gap-3 overflow-x-auto p-0">
      {trip.stops.map((stop, i) => (
        <StopCell
          key={stop.id}
          state={position.states[i]}
          cell={stopCell(stop, position.marks[i], position.states[i], heldAt >= 0 && i > heldAt)}
        />
      ))}
    </ol>
  );
};
