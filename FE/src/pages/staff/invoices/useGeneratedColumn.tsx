import { useMemo } from 'react';
import { Flex, TableColumnsType } from 'antd';

import { INVOICE_KIND, invoiceStatus } from '@/components/invoice/invoiceFormat';
import { Chip, Deadline } from '@/components/ui';
import type { InvoiceSummary } from '@/interfaces';
import { dueLeft, formatDate, money } from '@/lib/utils';

/** Invoices columns (DESIGN.md, Invoices): soonest due first, a row opens the invoice. */
export const useGeneratedInvoiceColumn = () =>
  useMemo<TableColumnsType<InvoiceSummary>>(
    () => [
      {
        title: 'Invoice',
        key: 'code',
        render: (_, i) => (
          <Flex vertical gap={2}>
            <span className="type-data text-ink">{i.code}</span>
            <span className="type-caption text-ink-3">
              {INVOICE_KIND[i.kind]} · {i.jobCode ?? i.requestCode}
            </span>
          </Flex>
        ),
      },
      {
        title: 'Club',
        key: 'club',
        render: (_, i) => (
          <Flex vertical gap={2}>
            <span className="type-body-s text-ink">{i.clubName}</span>
            <span className="type-caption text-ink-3">
              {i.kind === 'DEPOSIT' ? 'On acceptance' : 'After handover'}
            </span>
          </Flex>
        ),
      },
      {
        title: 'Amount due',
        key: 'amountDue',
        align: 'right',
        render: (_, i) => (
          <Flex vertical gap={2} align="end">
            <span className="type-data text-ink">{money(i.amountDue, i.currency)}</span>
            <span className="type-caption text-ink-3">of {money(i.total, i.currency)}</span>
          </Flex>
        ),
      },
      {
        title: 'Due',
        key: 'dueOn',
        width: 160,
        render: (_, i) =>
          i.dueOn && i.amountDue > 0 ? (
            <Deadline
              align="start"
              tone={i.overdue ? 'bad' : 'neutral'}
              left={dueLeft(i.dueOn, new Date().toISOString())}
              date={formatDate(i.dueOn)}
            />
          ) : (
            <span className="type-caption text-ink-3">{i.dueOn ? formatDate(i.dueOn) : '—'}</span>
          ),
      },
      {
        title: 'Status',
        key: 'status',
        width: 120,
        render: (_, i) => {
          const s = invoiceStatus(i.status, i.overdue);
          return <Chip tone={s.tone}>{s.label}</Chip>;
        },
      },
    ],
    [],
  );
