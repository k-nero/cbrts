import type { FC } from 'react';
import { Flex } from 'antd';

import { PAYMENT_METHOD } from '@/components/invoice/invoiceFormat';
import { Panel } from '@/components/ui';
import type { Invoice } from '@/interfaces';
import { formatDate, money } from '@/lib/utils';

/** Every payment recorded against the invoice, oldest first, with its method, reference and who recorded it. */
export const PaymentsPanel: FC<{ invoice: Invoice }> = ({ invoice }) => (
  <Panel title="Payments" flush>
    {invoice.payments.length === 0 ? (
      <p className="type-body-s m-0 px-6 py-4 text-ink-3">No payment recorded yet.</p>
    ) : (
      <ul className="m-0 list-none p-0">
        {invoice.payments.map((p, i) => (
          <li
            key={p.id}
            className={`flex items-start justify-between gap-4 px-6 py-3 ${i > 0 ? 'border-t border-line' : ''}`}
          >
            <Flex vertical gap={2}>
              <span className="type-label-s text-ink">
                {PAYMENT_METHOD[p.method]}
                {p.reference ? ` · ${p.reference}` : ''}
              </span>
              <span className="type-caption text-ink-3">
                Received {formatDate(p.receivedAt)}
                {p.recordedByName ? ` · recorded by ${p.recordedByName}` : ''}
              </span>
            </Flex>
            <span className="type-data text-ink">{money(p.amount, invoice.currency)}</span>
          </li>
        ))}
      </ul>
    )}
  </Panel>
);
