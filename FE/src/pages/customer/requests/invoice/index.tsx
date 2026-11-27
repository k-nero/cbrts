import type { FC } from 'react';
import { Flex, Skeleton } from 'antd';
import { useParams, useSearchParams } from 'react-router-dom';

import { HowToPay } from './HowToPay';

import { INVOICE_KIND, invoiceStatus, PAYMENT_METHOD } from '@/components/invoice/invoiceFormat';
import { InvoiceLines } from '@/components/invoice/InvoiceLines';
import { ReceiptButton } from '@/components/invoice/ReceiptButton';
import PageHeader from '@/components/PageHeader';
import { Callout, Chip, OwedItem, Panel } from '@/components/ui';
import { useCustomerInvoice } from '@/hooks/invoice';
import { dueLeft, formatDate, money } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

/**
 * The customer's invoice (US-F6-03, DESIGN.md "Invoice"): what is owed and by when as the one owed item, the lines
 * as quoted or actual with why they changed, then the deposit deducted, and how to pay. Stripe sends the customer back
 * here with `?card=paid` or `?card=cancelled`; after paying, the page waits for the webhook to record the payment.
 */
const RequestInvoicePage: FC = () => {
  const { id = '', invoiceId = '' } = useParams();
  const router = useCustomRouter();
  const [searchParams] = useSearchParams();
  const card = searchParams.get('card');
  const { data: invoice } = useCustomerInvoice(invoiceId, card === 'paid');
  if (!invoice) return <Skeleton active paragraph={{ rows: 8 }} />;
  const status = invoiceStatus(invoice.status, invoice.overdue);
  const owed = invoice.amountDue > 0 && invoice.dueOn;
  // A card payment made online has no staff recorder; one that came after the invoice was paid is refunded instead.
  const paidOnline = invoice.payments.some((p) => p.method === 'CARD' && !p.recordedByName);

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
          {card === 'paid' && owed && (
            <Callout tone="info" title="Confirming your card payment">
              Stripe has your payment. It shows under Payments once confirmed, usually within a
              minute.
            </Callout>
          )}
          {card === 'paid' && !owed && paidOnline && (
            <Callout tone="ok" title="Card payment received">
              Your payment is recorded. Download its receipt under Payments.
            </Callout>
          )}
          {card === 'paid' && !owed && !paidOnline && (
            <Callout tone="warn" title="Your card payment is being refunded">
              This invoice was already paid another way, so the card payment is sent back in full.
              Your notifications have the details.
            </Callout>
          )}
          {card === 'cancelled' && owed && (
            <Callout tone="info" title="Card payment cancelled">
              Nothing was charged. Pay by card again or by bank transfer, as below.
            </Callout>
          )}
          {owed ? (
            <Panel title="1 item" flush>
              <OwedItem
                urgency={invoice.overdue ? 'overdue' : 'soon'}
                title={`Pay ${invoice.code}`}
                subject={`${money(invoice.amountDue, invoice.currency)} due`}
                reason={
                  invoice.payableByCard
                    ? 'By card online, or by bank transfer with the invoice code as the reference.'
                    : 'By bank transfer, with the invoice code as the reference.'
                }
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
              <Flex vertical gap={8}>
                {invoice.payments.map((p) => (
                  <Flex key={p.id} justify="space-between" align="center" gap={16}>
                    <span className="type-body-s text-ink-2">
                      {formatDate(p.receivedAt)} · {PAYMENT_METHOD[p.method]}
                      {p.method === 'CARD' && !p.recordedByName ? ', online' : ''}
                    </span>
                    <Flex align="center" gap={8}>
                      <span className="type-data text-ink">
                        {money(p.amount, invoice.currency)}
                      </span>
                      <ReceiptButton side="customer" invoice={invoice} payment={p} />
                    </Flex>
                  </Flex>
                ))}
              </Flex>
            )}
          </Panel>
        </Flex>
      </div>
    </Flex>
  );
};

export default RequestInvoicePage;
