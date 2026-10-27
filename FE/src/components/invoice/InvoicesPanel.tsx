import type { FC, ReactNode } from 'react';
import { Flex, Skeleton } from 'antd';

import { INVOICE_KIND, invoiceStatus } from './invoiceFormat';

import { Button, Chip, Panel } from '@/components/ui';
import type { InvoiceSummary } from '@/interfaces';
import { formatDate, money } from '@/lib/utils';

type Props = {
  /** Oldest first: the deposit from acceptance, then the job's final invoice. */
  invoices: InvoiceSummary[] | undefined;
  loading?: boolean;
  /** Opens the invoice: the customer's invoice page, or the staff invoice detail. */
  onOpen: (invoice: InvoiceSummary) => void;
  /** Shown when there is no invoice yet; without it the panel hides. */
  empty?: ReactNode;
};

/** "$1,002.00 · $1,002.00 due by 31 Oct 2026", or the due day once paid; a draft has none yet. */
const amountLine = (inv: InvoiceSummary) => {
  const total = money(inv.total, inv.currency);
  if (!inv.dueOn) return `${total} · not issued yet`;
  return inv.amountDue > 0
    ? `${total} · ${money(inv.amountDue, inv.currency)} due by ${formatDate(inv.dueOn)}`
    : `${total} · due ${formatDate(inv.dueOn)}`;
};

/**
 * A move's invoices (US-F6-03): each one's kind and code, amount, due day and status as a tone
 * plus a word, with Open. Shared by the customer's request page and the staff Request review.
 */
export const InvoicesPanel: FC<Props> = ({ invoices, loading, onOpen, empty }) => {
  if (loading)
    return (
      <Panel title="Invoices">
        <Skeleton active title={false} paragraph={{ rows: 2 }} />
      </Panel>
    );
  if (!invoices?.length)
    return empty ? (
      <Panel title="Invoices">
        <p className="type-body-s m-0 text-ink-2">{empty}</p>
      </Panel>
    ) : null;
  return (
    <Panel
      title="Invoices"
      extra={<span className="type-data text-ink-3">{invoices.length}</span>}
      flush
    >
      <ul className="m-0 list-none p-0">
        {invoices.map((inv, i) => {
          const status = invoiceStatus(inv.status, inv.overdue);
          return (
            <li key={inv.id} className={`px-6 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
              <Flex align="center" justify="space-between" gap={16}>
                <Flex vertical gap={2}>
                  <span className="type-label-m text-ink">
                    {INVOICE_KIND[inv.kind]} · <span className="type-data">{inv.code}</span>
                  </span>
                  <span className="type-caption text-ink-3">{amountLine(inv)}</span>
                </Flex>
                <Flex align="center" gap={12}>
                  <Chip tone={status.tone}>{status.label}</Chip>
                  <Button
                    size="sm"
                    variant="ghost"
                    trailingIcon="arrow-right"
                    aria-label={`Open invoice ${inv.code}`}
                    onClick={() => onOpen(inv)}
                  >
                    Open
                  </Button>
                </Flex>
              </Flex>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
};
