import type { FC } from 'react';

import { Panel } from '@/components/ui';
import type { TripView } from '@/interfaces';

/** The horses on the escort's trailer, each with its stall, and the trailer itself. */
export const OnBoardPanel: FC<{ trip: TripView }> = ({ trip }) => (
  <Panel title="On board" flush>
    <ul className="m-0 list-none px-6 pt-1 pb-3">
      {trip.horses.map((horse) => (
        <li
          key={horse.id}
          className="flex items-center justify-between gap-3 border-t border-line py-2.5 first:border-t-0"
        >
          <span className="type-label-m text-ink">{horse.name}</span>
          <span className="type-body-s text-ink-2">{horse.stall ?? 'Stall not assigned'}</span>
        </li>
      ))}
      {trip.vehicleCode && (
        <li className="flex items-center justify-between gap-3 border-t border-line py-2.5">
          <span className="type-label-m text-ink">Trailer</span>
          <span className="type-caption text-ink-2">{trip.vehicleCode}</span>
        </li>
      )}
    </ul>
  </Panel>
);
