import type { FC } from 'react';
import type { TableColumnsType } from 'antd';

import Table from '@/components/table';
import type { RevenueReport } from '@/interfaces';
import { money } from '@/lib/utils';

type Row = RevenueReport['corridors'][number];

/**
 * The report by corridor, most revenue first: the chart's figures as a table too (dataviz, accessibility). A
 * fixed-order table, so no sort, filter or pages (DESIGN.md, Tables).
 */
export const CorridorTable: FC<{ report: RevenueReport }> = ({ report }) => {
  const m = (n: number) => money(n, report.currency);
  const columns: TableColumnsType<Row> = [
    { title: 'Corridor', key: 'label', dataIndex: 'label', width: 320 },
    { title: 'Jobs', key: 'jobs', dataIndex: 'jobs', width: 80, align: 'right' },
    {
      title: 'Revenue',
      key: 'revenue',
      width: 160,
      align: 'right',
      render: (_, c) => <span className="type-data text-ink">{m(c.revenue)}</span>,
    },
    {
      title: 'Direct cost',
      key: 'cost',
      width: 160,
      align: 'right',
      render: (_, c) => <span className="type-data text-ink-2">{m(c.cost)}</span>,
    },
    {
      title: 'Margin',
      key: 'marginPct',
      width: 100,
      align: 'right',
      render: (_, c) => (
        <span className="type-data text-ink">{c.marginPct == null ? '—' : `${c.marginPct}%`}</span>
      ),
    },
  ];
  return (
    <Table<Row>
      id="revenue-by-corridor"
      rowKey={(c) => c.corridorId ?? 'none'}
      columns={columns}
      dataSource={report.corridors}
      pagination={false}
      showColumnSettings={false}
      locale={{ emptyText: 'No job was settled in this period.' }}
    />
  );
};
