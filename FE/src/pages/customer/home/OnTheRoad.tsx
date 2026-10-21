import { type FC } from 'react';

import { RouteStrip } from '@/components/ui';
import type { TripNow } from '@/interfaces';
import { formatTime } from '@/lib/utils';

/* ---------- on the road ---------- */

/** The move on the road, from recorded checkpoints only (the same panel as Tracking · In transit). */
export const OnTheRoad: FC<{ trip: TripNow }> = ({ trip }) => (
  <section className="flex flex-col gap-5 rounded-lg border border-line bg-card p-6">
    <header className="flex items-end justify-between gap-6">
      <div className="flex flex-col gap-0.5">
        <h2 className="type-h3 m-0 text-ink">On the road</h2>
        <p className="type-body-s m-0 text-ink-3">
          Positions come from checkpoints the escort records. Between checkpoints we show the last
          confirmed one, never a guess.
        </p>
      </div>
      <span className="type-caption shrink-0 text-ink-3">Updated {formatTime(trip.updatedAt)}</span>
    </header>
    <RouteStrip gate={trip.gate} stops={trip.stops} />
  </section>
);
