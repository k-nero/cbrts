import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Spin } from 'antd';

import { formatTime, sentence } from './tripFormat';

import PageHeader from '@/components/PageHeader';
import { Button, Callout, Chip, cx, Panel } from '@/components/ui';
import { useTrips } from '@/hooks/trip';
import type { TripSummary } from '@/interfaces';
import { TripStatusEnum } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

const statusChip = (s: TripSummary['tripStatus']) =>
  s === TripStatusEnum.DELIVERED
    ? { tone: 'ok' as const, word: 'Delivered' }
    : s === TripStatusEnum.HELD
      ? { tone: 'warn' as const, word: 'Held' }
      : s === TripStatusEnum.NOT_STARTED
        ? { tone: 'neutral' as const, word: 'Not departed' }
        : { tone: 'info' as const, word: sentence(s) };

/**
 * The club's moves with a trip, newest first. Each opens its request, where the move is tracked (Tracking · In
 * transit, Delivered); a notification's link (/tracking?job=CBRT-…) goes straight there.
 */
export function CustomerTripPage() {
  const router = useCustomRouter();
  const [page, setPage] = useState(0);
  const query = useTrips('customer', page);
  const rows = query.data?.content ?? [];
  const [searchParams] = useSearchParams();
  const job = searchParams.get('job');
  const target = job ? rows.find((r) => r.jobCodes.includes(job))?.requestId : undefined;
  const open = (row: TripSummary) =>
    row.requestId && router.push(router.paths.get('request', { pathParams: [row.requestId] }));

  if (target)
    return <Navigate to={router.paths.get('request', { pathParams: [target] })} replace />;

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        reserveBack
        title="Trip tracking"
        summary="Every move on the road or delivered. Open one to follow it checkpoint by checkpoint."
      />
      {query.isPending && (
        <div className="py-12 text-center">
          <Spin />
        </div>
      )}
      {query.isError && (
        <Callout tone="bad" title="Your trips could not be loaded">
          {apiErrorMessage(query.error, 'Refresh the page to try again.')}
        </Callout>
      )}
      {query.data && rows.length === 0 && (
        <Panel title="No move on the road yet">
          <p className="type-body-s m-0 text-ink-2">
            A move appears here once its trip is planned. Until then, follow it from My requests.
          </p>
        </Panel>
      )}
      {rows.length > 0 && (
        <Panel
          title="Your moves"
          extra={<span className="type-data text-ink-3">{query.data?.totalElements}</span>}
          flush
        >
          <ul className="m-0 list-none p-0">
            {rows.map((row, i) => {
              const chip = statusChip(row.tripStatus);
              return (
                <li
                  key={row.jobCode}
                  className={cx(
                    'flex flex-wrap items-center gap-4 px-6 py-4',
                    i > 0 && 'border-t border-line',
                  )}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="type-label-m truncate text-ink">
                      {row.origin ?? 'Origin'} → {row.destination ?? 'Destination'}
                    </span>
                    <span className="type-caption text-ink-3">
                      {row.jobCode}
                      {row.lastUpdate ? ` · last checkpoint ${formatTime(row.lastUpdate)}` : ''}
                    </span>
                  </div>
                  <Chip tone={chip.tone}>{chip.word}</Chip>
                  <Button size="sm" disabled={!row.requestId} onClick={() => open(row)}>
                    Open
                  </Button>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
      {query.data && query.data.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" disabled={query.data.first} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="type-body-s text-ink-3">
            Page {page + 1} of {query.data.totalPages}
          </span>
          <Button size="sm" disabled={query.data.last} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
