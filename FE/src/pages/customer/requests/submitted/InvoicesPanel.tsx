import type { FC } from 'react';
import { Flex } from 'antd';

import { INVOICE_KIND, invoiceStatus } from '@/components/invoice/invoiceFormat';
import { Button, Chip, Panel } from '@/components/ui';
import { useRequestInvoices } from '@/hooks/invoice';
import { formatDate, money } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

/** The move's invoices (US-F6-03): the deposit from acceptance, then the final invoice after the handover. */
export const InvoicesPanel: FC<{ requestId: string }> = ({ requestId }) => {
  const router = useCustomRouter();
  const { data: invoices } = useRequestInvoices(requestId);
  if (!invoices?.length) return null;
  return (
    <Panel title="Invoices" flush>
      <ul className="m-0 list-none p-0">
        {invoices.map((inv, i) => {
          const status = invoiceStatus(inv.status, inv.overdue);
          return (
            <li
              key={inv.id}
              className={`flex items-center justify-between gap-4 px-6 py-3 ${i > 0 ? 'border-t border-line' : ''}`}
            >
              <Flex vertical gap={2}>
                <span className="type-label-m text-ink">
                  {INVOICE_KIND[inv.kind]} · <span className="type-data">{inv.code}</span>
                </span>
                <span className="type-caption text-ink-3">
                  {money(inv.total, inv.currency)}
                  {inv.amountDue > 0 && inv.dueOn
                    ? ` · ${money(inv.amountDue, inv.currency)} due by ${formatDate(inv.dueOn)}`
                    : ''}
                </span>
              </Flex>
              <Flex align="center" gap={12}>
                <Chip tone={status.tone}>{status.label}</Chip>
                <Button
                  size="sm"
                  variant="ghost"
                  trailingIcon="arrow-right"
                  onClick={() =>
                    router.push(
                      router.paths.get('request-invoice', { pathParams: [requestId, inv.id] }),
                    )
                  }
                >
                  Open
                </Button>
              </Flex>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
};
