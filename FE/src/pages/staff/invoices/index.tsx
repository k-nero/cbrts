import { useState } from 'react';
import { Flex } from 'antd';
import { useNavigate } from 'react-router-dom';

import { ReadyPanel } from './ReadyPanel';
import { useGeneratedInvoiceColumn } from './useGeneratedColumn';

import PageHeader from '@/components/PageHeader';
import Table from '@/components/table';
import { Tabs } from '@/components/ui';
import { useInvoiceList } from '@/hooks/invoice';
import type { InvoiceSummary, InvoiceView } from '@/interfaces';

const TABS: { key: InvoiceView; label: string }[] = [
  { key: 'TO_BE_PAID', label: 'To be paid' },
  { key: 'OVERDUE', label: 'Overdue' },
  { key: 'PAID', label: 'Paid' },
  { key: 'ALL', label: 'All' },
];

/**
 * Invoices (US-F6-03, DESIGN.md "Invoices"): the deposit issued at acceptance and the final invoice after the
 * handover, soonest due first; a row opens the invoice, where payments are recorded by hand.
 */
export default function InvoicesPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<InvoiceView>('TO_BE_PAID');
  const { listQuery, pageState, setPageState } = useInvoiceList(view);
  const columns = useGeneratedInvoiceColumn();
  const total = listQuery.data?.totalElements;

  return (
    <Flex vertical gap={28}>
      <PageHeader
        title="Invoices"
        summary="Deposits issued at acceptance and final invoices after the handover. Payments are recorded by hand."
      />
      <ReadyPanel />
      <Flex vertical gap={16}>
        <Tabs
          label="Invoice views"
          activeKey={view}
          onChange={(key) => {
            setView(key);
            setPageState((p) => ({ ...p, number: 0 }));
          }}
          items={TABS}
        />
        <Flex gap={8} align="center" style={{ minHeight: 32 }}>
          <span className="type-label-s text-ink">
            {total === undefined ? 'Invoices' : `${total} ${total === 1 ? 'invoice' : 'invoices'}`}
          </span>
          <span className="type-body-s text-ink-3">Soonest due first</span>
        </Flex>
        <Table<InvoiceSummary>
          id="invoices"
          rowKey="id"
          columns={columns}
          dataSource={listQuery.data?.content ?? []}
          loading={listQuery.isPending || listQuery.isFetching}
          onRefresh={() => void listQuery.refetch()}
          refreshing={listQuery.isFetching && !listQuery.isPending}
          onRow={(invoice) => ({
            onClick: () => navigate(`/staff/invoices/${invoice.id}`),
            className: 'cursor-pointer',
          })}
          pagination={{
            current: pageState.number + 1,
            pageSize: pageState.size,
            total: listQuery.data?.totalElements ?? 0,
            showTotal: (all, [from, to]) =>
              `${from}–${to} of ${all} ${all === 1 ? 'invoice' : 'invoices'}`,
          }}
          locale={{ emptyText: 'No invoices in this view.' }}
          onChange={(pagination) =>
            setPageState((p) => ({
              ...p,
              number: (pagination.current ?? 1) - 1,
              size: pagination.pageSize ?? p.size,
            }))
          }
        />
      </Flex>
    </Flex>
  );
}
