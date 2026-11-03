import { type FC, useMemo, useState } from 'react';
import { Flex, Grid, Pagination } from 'antd';
import type { TableColumnsType } from 'antd';

import DiscardDraftModal from './DiscardDraftModal';
import { RequestAction } from './RequestAction';
import { RequestCard } from './RequestCard';
import { RequestLink } from './RequestLink';
import { RequestStatusCell } from './RequestStatusCell';
import { RouteCell } from './RouteCell';

import PageHeader from '@/components/PageHeader';
import Table from '@/components/table';
import { Button, Callout, Panel } from '@/components/ui';
import { useMe } from '@/hooks/auth';
import { NEEDS_YOU_FIRST, useRequests } from '@/hooks/request';
import type { RequestSummary } from '@/interfaces';
import { formatDay } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

/** My requests (spec §7): the club's requests, and a way back into a draft. */
const MyRequestsPage: FC = () => {
  const router = useCustomRouter();
  const me = useMe().data;
  const crud = useRequests();
  const { listQuery, pageState, setPageState } = crud;
  const [discarding, setDiscarding] = useState<string | null>(null);
  const total = listQuery.data?.totalElements;
  const byDeparture = pageState.sort?.field === 'departureDate' ? pageState.sort : undefined;
  const empty = total === 0;
  const manyPages = (total ?? 0) > pageState.size;
  // Below the table's width (lg), each request is a card: the status column would scroll away first.
  const narrow = Grid.useBreakpoint().lg === false;
  const toNew = () => router.push(router.paths.get('request-new'));

  // One clock for the page's "Due in 3 days", read when the list arrives.
  const now = useMemo(
    () => new Date(listQuery.dataUpdatedAt || Date.now()).toISOString(),
    [listQuery.dataUpdatedAt],
  );
  const columns = useMemo<TableColumnsType<RequestSummary>>(
    () => [
      { title: 'Request', key: 'code', width: 150, render: (_, r) => <RequestLink row={r} /> },
      { title: 'Route', key: 'route', width: 320, render: (_, r) => <RouteCell row={r} /> },
      {
        title: 'Horses',
        key: 'horseCount',
        width: 88,
        render: (_, r) => (
          <span className="type-data text-ink">{r.horseCount > 0 ? r.horseCount : '—'}</span>
        ),
      },
      {
        title: 'Departs',
        key: 'departureDate',
        width: 140,
        sorter: true,
        render: (_, r) => <span className="type-data text-ink">{formatDay(r.departureDate)}</span>,
      },
      {
        title: 'Status',
        key: 'status',
        width: 260,
        ellipsis: false,
        render: (_, r) => <RequestStatusCell row={r} now={now} />,
      },
      {
        title: <span className="sr-only">Next step</span>,
        key: 'actions',
        width: 210,
        // The buttons go their own way; the click doesn't open the row as well.
        onCell: () => ({ onClick: (e) => e.stopPropagation() }),
        render: (_, r) => <RequestAction row={r} onDiscard={setDiscarding} />,
      },
    ],
    [now],
  );

  const count =
    total === undefined ? 'Requests' : `${total} ${total === 1 ? 'request' : 'requests'}`;

  return (
    <Flex vertical gap={28}>
      <PageHeader
        reserveBack
        title="My requests"
        summary={
          total === undefined ? undefined : `${count}${me?.clubName ? ` · ${me.clubName}` : ''}.`
        }
      />

      {listQuery.isError ? (
        <Callout
          tone="bad"
          title="Your requests didn't load"
          action={
            <Button size="sm" onClick={() => void listQuery.refetch()}>
              Try again
            </Button>
          }
        >
          Nothing has changed. Check your connection and try again.
        </Callout>
      ) : empty ? (
        <Panel title="No requests yet">
          <Flex vertical align="start" gap={16}>
            <p className="type-body-m m-0 text-ink-2">
              Your drafts and submitted requests appear here.
            </p>
            <Button variant="primary" onClick={toNew}>
              Request transport
            </Button>
          </Flex>
        </Panel>
      ) : (
        <Flex vertical gap={16}>
          <Flex align="center" gap={8} className="min-h-8">
            <span className="type-label-s text-ink">{count}</span>
            <span className="type-body-s text-ink-3">
              {byDeparture
                ? `Sorted by departure, ${byDeparture.order === 'ascend' ? 'earliest' : 'latest'} first`
                : 'Order: what needs you first, the soonest due on top'}
            </span>
            {byDeparture && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setPageState((p) => ({
                    ...p,
                    number: 0,
                    sort: NEEDS_YOU_FIRST,
                  }))
                }
              >
                Reset order
              </Button>
            )}
          </Flex>
          {narrow ? (
            <Flex vertical gap={16}>
              <ul className="m-0 flex list-none flex-col gap-3 p-0" aria-label="My requests">
                {(listQuery.data?.content ?? []).map((r) => (
                  <RequestCard key={r.id} row={r} now={now} onDiscard={setDiscarding} />
                ))}
              </ul>
              <Pagination
                align="center"
                hideOnSinglePage
                current={pageState.number + 1}
                pageSize={pageState.size}
                total={total ?? 0}
                onChange={(page) => setPageState((p) => ({ ...p, number: page - 1 }))}
              />
            </Flex>
          ) : (
            <Table<RequestSummary>
              id="my-requests"
              rowKey="id"
              aria-label="My requests"
              columns={columns}
              dataSource={listQuery.data?.content ?? []}
              // A refetch keeps the rows in place; only the first read shows the loading state.
              loading={listQuery.isPending}
              // A club's handful of requests needs no table tools; a long list gets them back.
              {...(manyPages && {
                onRefresh: () => void listQuery.refetch(),
                refreshing: listQuery.isFetching && !listQuery.isPending,
              })}
              resizableColumns={false}
              showColumnSettings={false}
              ignoreKeys={['actions']}
              // A row opens its request: a draft in the editor, any other at its request page.
              onRow={(r) => ({
                onClick: () =>
                  router.push(
                    router.paths.get(r.status === 'DRAFT' ? 'request-edit' : 'request', {
                      pathParams: [r.id],
                    }),
                  ),
                className: 'cursor-pointer',
              })}
              pagination={{
                current: pageState.number + 1,
                pageSize: pageState.size,
                total: total ?? 0,
                hideOnSinglePage: true,
                showSizeChanger: manyPages,
                showTotal: (all, [from, to]) => `${from}–${to} of ${all} requests`,
              }}
              onChange={(pagination, _filters, sorter) => {
                const s = Array.isArray(sorter) ? sorter[0] : sorter;
                setPageState({
                  number: (pagination.current ?? 1) - 1,
                  size: pagination.pageSize ?? pageState.size,
                  sort: s?.order ? { field: String(s.columnKey), order: s.order } : NEEDS_YOU_FIRST,
                });
              }}
            />
          )}
        </Flex>
      )}

      <DiscardDraftModal id={discarding} onClose={() => setDiscarding(null)} />
    </Flex>
  );
};

export default MyRequestsPage;
