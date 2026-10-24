import type { FC, ReactNode } from 'react';
import { Flex } from 'antd';

import { LINE_TAG, qty } from './invoiceFormat';

import { Chip, Panel } from '@/components/ui';
import type { Invoice, InvoiceLine } from '@/interfaces';
import { money } from '@/lib/utils';

type Props = {
  invoice: Invoice;
  /** An action on a line, such as setting an estimated line's actual quantity on a draft. */
  lineAction?: (line: InvoiceLine) => ReactNode;
};

/**
 * An invoice's lines in order (US-F6-03, DESIGN.md "Invoice"): each tagged As quoted or Actual, an actual line on the
 * raised surface with its reason beneath and the quoted figure beside it; then the total, what was paid, and the
 * amount due.
 */
export const InvoiceLines: FC<Props> = ({ invoice, lineAction }) => {
  const m = (n: number) => money(n, invoice.currency);
  return (
    <Panel title="Lines" flush>
      <ol className="m-0 list-none p-0">
        {invoice.lines.map((line, i) => {
          const tag = LINE_TAG[line.kind];
          const actual = line.kind === 'ACTUALISED';
          return (
            <li
              key={line.id}
              className={`grid grid-cols-[minmax(0,1fr)_140px] gap-4 px-6 py-3 ${
                i > 0 ? 'border-t border-line' : ''
              } ${actual ? 'bg-raised' : ''}`}
            >
              <Flex vertical gap={4} className="min-w-0">
                <Flex align="center" gap={8} wrap>
                  <span className="type-body-m text-ink">{line.description}</span>
                  <Chip tone={tag.tone} dot={false}>
                    {tag.label}
                  </Chip>
                  {lineAction?.(line)}
                </Flex>
                {line.quantity != null && line.unitRate != null && (
                  <span className="type-caption text-ink-3">
                    {qty(line.quantity)} × {m(line.unitRate)}
                    {actual && line.quotedQuantity != null
                      ? ` · quoted ${qty(line.quotedQuantity)} × ${m(line.unitRate)} = ${m(line.quotedAmount ?? 0)}`
                      : ''}
                  </span>
                )}
                {line.note && line.kind !== 'ADJUSTMENT' && (
                  <span className="type-body-s text-ink-2">{line.note}</span>
                )}
              </Flex>
              <span className={`type-data text-right ${line.amount < 0 ? 'text-ok' : 'text-ink'}`}>
                {m(line.amount)}
              </span>
            </li>
          );
        })}
      </ol>
      <dl className="m-0 border-t border-line bg-sunken px-6 py-4">
        {[
          ['Total', invoice.total],
          ...(invoice.amountPaid > 0 ? [['Paid', -invoice.amountPaid] as const] : []),
        ].map(([label, amount]) => (
          <Flex key={label} justify="space-between" className="py-1">
            <dt className="type-label-s text-ink-2">{label}</dt>
            <dd className="type-data m-0 text-ink">{m(amount as number)}</dd>
          </Flex>
        ))}
        <Flex justify="space-between" align="baseline" className="mt-2 border-t border-line pt-3">
          <dt className="type-label-m text-ink">Amount due</dt>
          <dd className="type-display-m m-0 text-ink">{m(invoice.amountDue)}</dd>
        </Flex>
      </dl>
    </Panel>
  );
};
