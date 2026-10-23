import { type FC } from 'react';
import { Flex } from 'antd';

import { RouteStrip } from '@/components/ui';
import type { TripNow } from '@/interfaces';
import { formatTime } from '@/lib/utils';

/* ---------- on the road ---------- */

/** The move on the road, from recorded checkpoints only (the same panel as Tracking · In transit). */
export const OnTheRoad: FC<{ trip: TripNow }> = ({ trip }) => (
  <section className="rounded-lg border border-line bg-card p-6">
    <Flex vertical gap={20}>
      <Flex component="header" align="end" justify="space-between" gap={24}>
        <Flex vertical gap={2}>
          <h2 className="type-h3 m-0 text-ink">On the road</h2>
          <p className="type-body-s m-0 text-ink-3">
            Positions come from checkpoints the escort records. Between checkpoints we show the last
            confirmed one, never a guess.
          </p>
        </Flex>
        <span className="type-caption shrink-0 text-ink-3">
          Updated {formatTime(trip.updatedAt)}
        </span>
      </Flex>
      <RouteStrip gate={trip.gate} stops={trip.stops} />
    </Flex>
  </section>
);
