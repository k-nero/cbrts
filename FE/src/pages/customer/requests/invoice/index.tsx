import type { FC } from 'react';
import { Flex, Skeleton } from 'antd';
import { useParams } from 'react-router-dom';

import { HowToPay } from './HowToPay';

import { INVOICE_KIND, invoiceStatus, PAYMENT_METHOD } from '@/components/invoice/invoiceFormat';
import { InvoiceLines } from '@/components/invoice/InvoiceLines';
import PageHeader from '@/components/PageHeader';
import { Chip, OwedItem, Panel } from '@/components/ui';
import { useCustomerInvoice } from '@/hooks/invoice';
import { dueLeft, formatDate, money } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

/**
 * The customer's invoice (US-F6-03, DESIGN.md "Invoice"): what is owed and by when as the one owed item, the lines
 * as quoted or actual with why they changed, then the deposit deducted, and how to pay.
 */
const RequestInvoicePage: FC = () => {
  const { id = '', invoiceId = '' } = useParams();
  const router = useCustomRouter();
  const { data: invoice } = useCustomerInvoice(invoiceId);
  if (!invoice) return <Skeleton active paragraph={{ rows: 8 }} />;
  const status = invoiceStatus(invoice.status, invoice.overdue);
  const owed = invoice.amountDue > 0 && invoice.dueOn;

  return (
    <Flex vertical gap={28}>
      <PageHeader
        back={{
          label: invoice.requestCode ?? 'Request',
          onClick: () => router.push(router.paths.get('request', { pathParams: [id] })),
        }}
        title={`${INVOICE_KIND[invoice.kind]} invoice`}
        summary={
          <Flex component="span" vertical gap={4}>
            <span className="type-data-l text-ink">{invoice.code}</span>
            <span>
              {invoice.jobCode ? `${invoice.jobCode} · ` : ''}against {invoice.quotationCode} v
              {invoice.quotationVersion}
            </span>
          </Flex>
        }
        right={<Chip tone={status.tone}>{status.label}</Chip>}
      />
      <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-6">
        <Flex vertical gap={24}>
          {owed ? (
            <Panel title="1 item" flush>
              <OwedItem
                urgency={invoice.overdue ? 'overdue' : 'soon'}
                title={`Pay ${invoice.code}`}
                subject={`${money(invoice.amountDue, invoice.currency)} due`}
                reason="By bank transfer, with the invoice code as the reference."
                deadline={{
                  left: dueLeft(invoice.dueOn!, new Date().toISOString()),
                  date: formatDate(invoice.dueOn!),
                }}
              />
            </Panel>
          ) : (
            <Panel title="Nothing needed from you">
              <p className="type-body-m m-0 text-ink-2">
                {invoice.status === 'PAID'
                  ? 'This invoice is paid. Thank you.'
                  : 'Nothing is owed on this invoice.'}
              </p>
            </Panel>
          )}
          <InvoiceLines invoice={invoice} />
        </Flex>
        <Flex vertical gap={24}>
          {owed && <HowToPay invoice={invoice} />}
          <Panel title="Payments">
            {invoice.payments.length === 0 ? (
              <p className="type-body-s m-0 text-ink-3">None recorded yet.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {invoice.payments.map((p) => (
                  <li key={p.id} className="flex justify-between gap-4">
                    <span className="type-body-s text-ink-2">
                      {formatDate(p.receivedAt)} · {PAYMENT_METHOD[p.method]}
                    </span>
                    <span className="type-data text-ink">{money(p.amount, invoice.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </Flex>
      </div>
    </Flex>
  );
};

export default RequestInvoicePage;
