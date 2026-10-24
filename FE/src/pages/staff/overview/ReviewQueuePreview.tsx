import type { FC } from 'react';
import { Flex } from 'antd';
import { Link } from 'react-router-dom';

import { Button, Panel } from '@/components/ui';
import type { QueueRow } from '@/interfaces';
import { formatDate, timeAgo } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

/**
 * A preview of the review queue (DESIGN.md, Tables): the oldest requests first, each opening its review; the full
 * list is one link away instead of a pager.
 */
export const ReviewQueuePreview: FC<{ rows: QueueRow[]; total: number; asOf: string }> = ({
  rows,
  total,
  asOf,
}) => {
  const router = useCustomRouter();
  return (
    <Panel
      title="Review queue"
      flush
      footer={
        total > 0 ? (
          <Flex justify="end">
            <Button
              size="sm"
              variant="ghost"
              trailingIcon="arrow-right"
              onClick={() => router.push(router.paths.get('requests'))}
            >
              View all {total} in Requests
            </Button>
          </Flex>
        ) : undefined
      }
    >
      {rows.length === 0 ? (
        <p className="type-body-m m-0 px-6 py-5 text-ink-2">
          Nothing waiting for review. New requests appear here, oldest first.
        </p>
      ) : (
        <ul className="m-0 list-none p-0">
          {rows.map((r, i) => (
            <li key={r.id} className={i > 0 ? 'border-t border-line' : ''}>
              <Link
                to={`/staff/requests/${r.id}`}
                className="grid grid-cols-[130px_minmax(0,1fr)_110px_70px] items-center gap-4 px-6 py-3 text-inherit no-underline hover:bg-raised"
              >
                <span className="type-caption text-ink">{r.code}</span>
                <Flex vertical gap={2} className="min-w-0">
                  <span className="type-body-s truncate text-ink">{r.club}</span>
                  <span className="type-caption truncate text-ink-3">
                    {r.fromCity ?? '—'} → {r.toCity ?? '—'} · {r.horseCount}{' '}
                    {r.horseCount === 1 ? 'horse' : 'horses'}
                    {r.status === 'CUSTOMER_ACCEPTED' ? ' · accepted, to approve' : ''}
                  </span>
                </Flex>
                <span className="type-caption text-ink-2">
                  {r.departureDate ? `Departs ${formatDate(r.departureDate)}` : ''}
                </span>
                <span className="type-caption text-right text-ink-3">
                  {timeAgo(r.waitingSince, asOf).replace(' ago', '')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
};
