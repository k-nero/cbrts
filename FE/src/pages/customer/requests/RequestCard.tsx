import { type FC } from 'react';
import { Flex } from 'antd';

import { RequestAction } from './RequestAction';
import { RequestLink } from './RequestLink';
import { RequestStatusCell } from './RequestStatusCell';
import { RouteCell } from './RouteCell';

import type { RequestSummary } from '@/interfaces';
import { formatDay } from '@/lib/utils';

/**
 * A request below the table's width: what holds it first, then the route, then its step, so the
 * column that answers "do I owe anything?" never scrolls out of sight.
 */
export const RequestCard: FC<{
  row: RequestSummary;
  now: string;
  onDiscard: (id: string) => void;
}> = ({ row: r, now, onDiscard }) => (
  <li className="rounded-lg border border-line bg-card p-4">
    <Flex vertical gap={12}>
      <RequestStatusCell row={r} now={now} />
      <RouteCell row={r} />
      <Flex align="center" justify="space-between" gap={12} wrap>
        <span className="type-body-s text-ink-2">
          <RequestLink row={r} />
          {' · '}
          {r.horseCount > 0
            ? `${r.horseCount} ${r.horseCount === 1 ? 'horse' : 'horses'}`
            : 'No horses yet'}
          {r.departureDate && ` · departs ${formatDay(r.departureDate)}`}
        </span>
        <RequestAction row={r} onDiscard={onDiscard} />
      </Flex>
    </Flex>
  </li>
);
