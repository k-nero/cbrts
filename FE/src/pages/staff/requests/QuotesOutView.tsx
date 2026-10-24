import { type FC, useState } from 'react';
import { Flex } from 'antd';
import type { TableColumnsType } from 'antd';

import Table from '@/components/table';
import { Deadline, Panel } from '@/components/ui';
import { useQuotesOut } from '@/hooks/overview';
import type { QuoteOut } from '@/interfaces';
import { daysUntil, dueLeft, formatDate, money } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

const columns = (now: string): TableColumnsType<QuoteOut> => [
  {
    title: 'Quotation',
    key: 'quotation',
    width: 200,
    render: (_, q) => (
      <Flex vertical gap={2}>
        <span className="type-data text-ink">
          {q.quotationCode} v{q.versionNo}
        </span>
        <span className="type-caption text-ink-3">{q.requestCode}</span>
      </Flex>
    ),
  },
  { title: 'Club', key: 'club', dataIndex: 'club', width: 240 },
  {
    title: 'Total',
    key: 'total',
    align: 'right',
    width: 160,
    render: (_, q) => <span className="type-data text-ink">{money(q.total, q.currency)}</span>,
  },
  {
    title: 'Valid until',
    key: 'validUntil',
    width: 180,
    render: (_, q) => (
      <Deadline
        align="start"
        tone={daysUntil(q.validUntil, now) <= 2 ? 'warn' : 'neutral'}
        left={dueLeft(q.validUntil, now).replace('Due', 'Expires')}
        date={formatDate(q.validUntil)}
      />
    ),
  },
];

/**
 * Quotes out (US-R-01): issued quotations waiting for the customer's answer, soonest to expire first; a row opens
 * the request. The Overview's "Quotes out" tile opens this tab.
 */
export const QuotesOutView: FC = () => {
  const router = useCustomRouter();
  const [page, setPage] = useState(0);
  const query = useQuotesOut(page);
  const total = query.data?.totalElements ?? 0;
  const now = new Date().toISOString();
  if (query.isSuccess && total === 0) {
    return (
      <Panel title="No quotation waiting for a customer">
        <p className="type-body-m m-0 text-ink-2">
          An issued quotation appears here until the club accepts or declines it, or it expires.
        </p>
      </Panel>
    );
  }
  return (
    <Flex vertical gap={16}>
      <Flex gap={8} align="center">
        <span className="type-label-s text-ink">{`${total} out`}</span>
        <span className="type-body-s text-ink-3">Soonest to expire first</span>
      </Flex>
      <Table<QuoteOut>
        id="quotes-out"
        rowKey="quotationCode"
        columns={columns(now)}
        dataSource={query.data?.content ?? []}
        loading={query.isFetching}
        onRow={(q) => ({
          onClick: () =>
            router.push(router.paths.get('request-review', { pathParams: [q.requestId] })),
          className: 'cursor-pointer',
        })}
        pagination={{
          current: page + 1,
          pageSize: 20,
          showSizeChanger: false,
          total,
          showTotal: (all, [from, to]) => `${from}–${to} of ${all} quotations`,
        }}
        onChange={(pagination) => setPage((pagination.current ?? 1) - 1)}
      />
    </Flex>
  );
};
