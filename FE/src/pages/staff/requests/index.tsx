import { type FC, useEffect, useMemo, useState } from 'react';
import { Skeleton, type TableColumnsType } from 'antd';

import PageHeader from '@/components/PageHeader';
import Table from '@/components/table';
import { Button, Callout, Panel } from '@/components/ui';
import { useReviewQueue } from '@/hooks/staffRequest';
import type { QueueRow } from '@/interfaces';
import { ageWords, departsWords, queueRoute } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

/**
 * Requests (spec §5.1): the logistics manager's review queue, oldest first. The order is the point,
 * so the table has no sort, filter or search (DESIGN.md, Review queues).
 */
const RequestsPage: FC = () => {
  const router = useCustomRouter();
  const [page, setPage] = useState(0);
  const query = useReviewQueue(page);
  const total = query.data?.totalElements;
  const now = new Date();

  const open = (id: string) =>
    router.push(router.paths.get('request-review', { pathParams: [id] }));

  const columns: TableColumnsType<QueueRow> = useMemo(
    () => [
      {
        key: 'code',
        title: 'Request',
        width: 150,
        render: (_, r) => (
          <span className="flex flex-col gap-0.5">
            <span className="type-caption text-ink">{r.code}</span>
            {r.revisionNo >= 2 && (
              <span className="type-body-s text-ink-3">Version {r.revisionNo}</span>
            )}
          </span>
        ),
      },
      { key: 'club', title: 'Customer', width: 200, dataIndex: 'club' },
      {
        key: 'route',
        title: 'Route',
        render: (_, r) => {
          const route = queueRoute(r);
          return (
            <span className="flex flex-col gap-0.5">
              <span className="type-body-m text-ink">{route.title}</span>
              <span className="type-body-s text-ink-3">{route.by}</span>
            </span>
          );
        },
      },
      {
        key: 'horses',
        title: 'Horses',
        width: 90,
        align: 'right',
        render: (_, r) => <span className="type-data text-ink">{r.horseCount}</span>,
      },
      {
        key: 'departs',
        title: 'Departs',
        width: 130,
        render: (_, r) =>
          r.departureDate ? (
            <span className="type-caption text-ink-2">
              {departsWords(r.departureDate, r.dateFlexDays)}
            </span>
          ) : null,
      },
      {
        key: 'age',
        title: 'Age',
        width: 80,
        align: 'right',
        render: (_, r) => (
          <span className="type-caption text-ink">{ageWords(r.waitingSince, now)}</span>
        ),
      },
      {
        key: 'open',
        width: 48,
        align: 'right',
        // The row opens on a click; this button is the keyboard's way in.
        render: (_, r) => (
          <Button
            size="sm"
            variant="ghost"
            trailingIcon="arrow-right"
            aria-label={`Open ${r.code}`}
            onClick={(e) => {
              e.stopPropagation();
              open(r.id);
            }}
          />
        ),
      },
    ],
    // `now` moves every render; the ages only need to be as fresh as the last render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query.dataUpdatedAt],
  );

  const empty = query.isSuccess && total === 0;
  // A page emptied by returns steps back to the last page that has rows.
  useEffect(() => {
    if (page > 0 && query.isSuccess && query.data.content.length === 0) setPage(page - 1);
  }, [page, query.isSuccess, query.data]);

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Requests"
        summary="Oldest first. Requests waiting for feasibility review."
      />

      {query.isError ? (
        <Callout
          tone="bad"
          title="The queue didn't load."
          action={
            <Button size="sm" variant="secondary" onClick={() => void query.refetch()}>
              Try again
            </Button>
          }
        >
          Nothing has changed. Check your connection and try again.
        </Callout>
      ) : query.isPending ? (
        <div className="flex flex-col gap-4" aria-busy>
          <span className="type-label-s text-ink">Waiting</span>
          <Panel>
            <Skeleton active title={false} paragraph={{ rows: 6 }} />
          </Panel>
        </div>
      ) : empty ? (
        <Panel title="Nothing waiting for review">
          <p className="type-body-m m-0 text-ink-2">
            New requests appear here, oldest first, as clubs submit them.
          </p>
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          <span className="type-label-s text-ink">{`${total ?? 0} waiting`}</span>
          <Table<QueueRow>
            id="review-queue"
            rowKey="id"
            columns={columns}
            dataSource={query.data?.content ?? []}
            loading={query.isFetching}
            ignoreKeys={['open']}
            onRow={(r) => ({ onClick: () => open(r.id), className: 'cursor-pointer' })}
            pagination={{
              current: page + 1,
              pageSize: 20,
              showSizeChanger: false,
              total: total ?? 0,
              showTotal: (all, [from, to]) => `${from}–${to} of ${all} requests`,
            }}
            onChange={(pagination) => setPage((pagination.current ?? 1) - 1)}
          />
        </div>
      )}
    </div>
  );
};

export default RequestsPage;
