import { type FC, useMemo, useState } from 'react';
import { Flex } from 'antd';
import type { TableColumnsType } from 'antd';

import DiscardDraftModal from './DiscardDraftModal';
import { RouteCell } from './RouteCell';

import PageHeader from '@/components/PageHeader';
import Table from '@/components/table';
import { Button, Callout, Chip, Panel } from '@/components/ui';
import { useMe } from '@/hooks/auth';
import { useRequests } from '@/hooks/request';
import type { RequestSummary } from '@/interfaces';
import { formatDay, ict, requestStatusChip } from '@/lib/utils';
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
            <Flex component="span" vertical align="start" gap={4}>
              <Chip>Draft</Chip>
              <span className="type-caption text-ink-3">
                Started {ict(r.createdAt).format('D MMM')}
              </span>
            </Flex>
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
        // The buttons go their own way; the click doesn't open the row as well.
        onCell: () => ({ onClick: (e) => e.stopPropagation() }),
        render: (_, r) =>
          r.status === 'DRAFT' ? (
            <Flex component="span" justify="end" gap={8}>
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
            </Flex>
          ) : r.status === 'INFO_REQUIRED' ? (
            <Flex component="span" justify="end">
              <Button
                size="sm"
                onClick={() => router.push(router.paths.get('request', { pathParams: [r.id] }))}
              >
                Answer
              </Button>
            </Flex>
          ) : r.quotation ? (
            <Flex component="span" justify="end">
              <Button
                size="sm"
                variant={r.status === 'QUOTED' ? 'primary' : 'secondary'}
                onClick={() =>
                  router.push(router.paths.get('request-quotation', { pathParams: [r.id] }))
                }
              >
                {r.status === 'QUOTED' ? 'Review quotation' : 'Open quotation'}
              </Button>
            </Flex>
          ) : null,
      },
    ],
    [router],
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
          </Flex>
          <Table<RequestSummary>
            id="my-requests"
            rowKey="id"
            columns={columns}
            dataSource={listQuery.data?.content ?? []}
            loading={listQuery.isPending || listQuery.isFetching}
            onRefresh={() => void listQuery.refetch()}
            refreshing={listQuery.isFetching && !listQuery.isPending}
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
        </Flex>
      )}

      <DiscardDraftModal id={discarding} onClose={() => setDiscarding(null)} />
    </Flex>
  );
};

export default MyRequestsPage;
