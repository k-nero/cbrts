import { type FC, useMemo, useState } from 'react';
import type { TableColumnsType } from 'antd';

import DiscardDraftModal from './DiscardDraftModal';

import PageHeader from '@/components/PageHeader';
import Table from '@/components/table';
import { Button, Callout, Chip, Panel } from '@/components/ui';
import { useMe } from '@/hooks/auth';
import { useRequests } from '@/hooks/request';
import type { Endpoint, RequestSummary } from '@/interfaces';
import { formatDay, ict, requestStatusChip } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

const cityOf = (e: Endpoint | null) => (e ? (e.placeId ? e.city : e.text) : null);

/** The route as the pass reads it, the place names beneath. */
const RouteCell: FC<{ row: RequestSummary }> = ({ row }) => {
  const from = cityOf(row.origin);
  const to = cityOf(row.destination);
  if (!from && !to) return <span className="type-body-s text-ink-3">Route not set</span>;
  const places = [row.origin?.name, row.destination?.name].filter(Boolean).join(' → ');
  return (
    <span className="flex flex-col gap-0.5">
      <span className="type-label-s text-ink">
        {from ?? '—'} → {to ?? '—'}
      </span>
      {places && <span className="type-body-s text-ink-3">{places}</span>}
    </span>
  );
};

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
  const toNew = () => router.push(router.paths.get('request-new'));

  const columns = useMemo<TableColumnsType<RequestSummary>>(
    () => [
      {
        title: 'Request',
        key: 'code',
        width: 170,
        render: (_, r) =>
          r.code ? (
            <span className="type-caption text-ink">{r.code}</span>
          ) : (
            <span className="flex flex-col items-start gap-1">
              <Chip>Draft</Chip>
              <span className="type-caption text-ink-3">
                Started {ict(r.createdAt).format('D MMM')}
              </span>
            </span>
          ),
      },
      { title: 'Route', key: 'route', width: 340, render: (_, r) => <RouteCell row={r} /> },
      {
        title: 'Horses',
        key: 'horseCount',
        width: 96,
        render: (_, r) => <span className="type-data text-ink">{r.horseCount}</span>,
      },
      {
        title: 'Departs',
        key: 'departureDate',
        width: 150,
        sorter: true,
        render: (_, r) => <span className="type-data text-ink">{formatDay(r.departureDate)}</span>,
      },
      {
        title: 'Status',
        key: 'status',
        width: 150,
        render: (_, r) => {
          const chip = requestStatusChip(r.status);
          return <Chip tone={chip.tone}>{chip.label}</Chip>;
        },
      },
      {
        key: 'actions',
        width: 230,
        render: (_, r) =>
          r.status === 'DRAFT' ? (
            <span className="flex justify-end gap-2">
              <Button
                size="sm"
                onClick={() =>
                  router.push(router.paths.get('request-edit', { pathParams: [r.id] }))
                }
              >
                Continue draft
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDiscarding(r.id)}>
                Discard
              </Button>
            </span>
          ) : r.status === 'INFO_REQUIRED' ? (
            <span className="flex justify-end">
              <Button
                size="sm"
                onClick={() =>
                  router.push(router.paths.get('request-submitted', { pathParams: [r.id] }))
                }
              >
                Answer
              </Button>
            </span>
          ) : null,
      },
    ],
    [router],
  );

  const count =
    total === undefined ? 'Requests' : `${total} ${total === 1 ? 'request' : 'requests'}`;

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        reserveBack
        title="My requests"
        summary={
          total === undefined ? undefined : `${count}${me?.clubName ? ` · ${me.clubName}` : ''}.`
        }
        right={
          !empty && (
            <Button leadingIcon="plus" onClick={toNew}>
              Request transport
            </Button>
          )
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
          <div className="flex flex-col items-start gap-4">
            <p className="type-body-m m-0 text-ink-2">
              Your drafts and submitted requests appear here.
            </p>
            <Button variant="primary" onClick={toNew}>
              Request transport
            </Button>
          </div>
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex min-h-8 items-center gap-2">
            <span className="type-label-s text-ink">{count}</span>
            <span className="type-body-s text-ink-3">
              {byDeparture
                ? `Sorted by departure, ${byDeparture.order === 'ascend' ? 'earliest' : 'latest'} first`
                : 'Order: newest first'}
            </span>
            {byDeparture && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setPageState((p) => ({
                    ...p,
                    number: 0,
                    sort: { field: 'createdAt', order: 'descend' },
                  }))
                }
              >
                Reset order
              </Button>
            )}
          </div>
          <Table<RequestSummary>
            id="my-requests"
            rowKey="id"
            columns={columns}
            dataSource={listQuery.data?.content ?? []}
            loading={listQuery.isPending || listQuery.isFetching}
            onRefresh={() => void listQuery.refetch()}
            refreshing={listQuery.isFetching && !listQuery.isPending}
            ignoreKeys={['actions']}
            pagination={{
              current: pageState.number + 1,
              pageSize: pageState.size,
              total: total ?? 0,
              showTotal: (all, [from, to]) => `${from}–${to} of ${all} requests`,
            }}
            onChange={(pagination, _filters, sorter) => {
              const s = Array.isArray(sorter) ? sorter[0] : sorter;
              setPageState({
                number: (pagination.current ?? 1) - 1,
                size: pagination.pageSize ?? pageState.size,
                sort: s?.order
                  ? { field: String(s.columnKey), order: s.order }
                  : { field: 'createdAt', order: 'descend' },
              });
            }}
          />
        </div>
      )}

      <DiscardDraftModal id={discarding} onClose={() => setDiscarding(null)} />
    </div>
  );
};

export default MyRequestsPage;
