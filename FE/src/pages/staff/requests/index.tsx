import { type FC, useEffect, useState } from 'react';
import { Flex, Skeleton } from 'antd';

import PageHeader from '@/components/PageHeader';
import Table from '@/components/table';
import { Button, Callout, Panel } from '@/components/ui';
import { useReviewQueue } from '@/hooks/staffRequest';
import type { QueueRow } from '@/interfaces';
import { useCustomRouter } from '@/router/route.hook';
import { useGeneratedRequestColumn } from '@/pages/staff/requests/useGeneratedRequestColumn.tsx';

/**
 * Requests (spec §5.1): the logistics manager's review queue, oldest first. The order is the point,
 * so the table has no sort, filter or search (DESIGN.md, Review queues).
 */
const RequestsPage: FC = () => {
  const router = useCustomRouter();
  const [page, setPage] = useState(0);
  const query = useReviewQueue(page);
  const total = query.data?.totalElements;
  const columns = useGeneratedRequestColumn({ query });
  const open = (id: string) =>
    router.push(router.paths.get('request-review', { pathParams: [id] }));

  const empty = query.isSuccess && total === 0;
  // A page emptied by returns steps back to the last page that has rows.
  useEffect(() => {
    if (page > 0 && query.isSuccess && query.data.content.length === 0) setPage(page - 1);
  }, [page, query.isSuccess, query.data]);

  return (
    <Flex vertical gap={28}>
      <PageHeader
        title="Requests"
        summary="Oldest first. Requests waiting for feasibility review, or for your approval once the customer accepts."
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
        <Flex vertical gap={16} aria-busy>
          <span className="type-label-s text-ink">Waiting</span>
          <Panel>
            <Skeleton active title={false} paragraph={{ rows: 6 }} />
          </Panel>
        </Flex>
      ) : empty ? (
        <Panel title="Nothing waiting for review">
          <p className="type-body-m m-0 text-ink-2">
            New requests appear here, oldest first, as clubs submit them.
          </p>
        </Panel>
      ) : (
        <Flex vertical gap={16}>
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
        </Flex>
      )}
    </Flex>
  );
};

export default RequestsPage;
