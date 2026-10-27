import { useState } from 'react';
import { App, Col, Flex, Row, Skeleton } from 'antd';
import { Link, useParams } from 'react-router-dom';

import { ActualModal } from './ActualModal';
import { PaymentsPanel } from './PaymentsPanel';
import { RecordPaymentPanel } from './RecordPaymentPanel';

import { INVOICE_KIND, invoiceStatus } from '@/components/invoice/invoiceFormat';
import { InvoiceLines } from '@/components/invoice/InvoiceLines';
import PageHeader from '@/components/PageHeader';
import { Button, Chip, Panel } from '@/components/ui';
import { useInvoice, useIssueInvoice } from '@/hooks/invoice';
import type { InvoiceLine } from '@/interfaces';
import { apiErrorMessage, formatDate, formatDayTime, money } from '@/lib/utils';

/** A label over its value. */
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Flex vertical gap={2}>
      <span className="type-caption text-ink-3">{label}</span>
      <span className="type-body-m text-ink">{children}</span>
    </Flex>
  );
}

/**
 * One invoice (US-F6-03): its lines settled against the accepted quotation and the payments recorded. A draft final
 * invoice takes the actual quantity of each estimated line, then is issued; an issued invoice is never edited.
 */
export default function InvoiceDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { message } = App.useApp();
  const { data: invoice } = useInvoice(id);
  const issue = useIssueInvoice(id);
  const [editing, setEditing] = useState<InvoiceLine | null>(null);
  if (!invoice) return <Skeleton active paragraph={{ rows: 8 }} />;

  const status = invoiceStatus(invoice.status, invoice.overdue);
  const draft = invoice.status === 'DRAFT';
  const owed = invoice.status === 'ISSUED' || invoice.status === 'PARTIALLY_PAID';
  return (
    <Flex vertical gap={28}>
      <PageHeader
        title={`${invoice.code} · ${INVOICE_KIND[invoice.kind]} invoice`}
        summary={`${invoice.clubName} · ${invoice.jobCode ?? invoice.requestCode} · against ${invoice.quotationCode} v${invoice.quotationVersion}`}
        right={<Chip tone={status.tone}>{status.label}</Chip>}
      />
      <Row gutter={[24, 24]} align="top">
        <Col xs={24} lg={16}>
          <Flex vertical gap={24}>
            {draft && (
              <Panel title="Before you issue it">
                <Flex vertical gap={12}>
                  <p className="type-body-m m-0 text-ink-2">
                    Set what actually happened on each estimated line; the totals follow in the
                    quotation&apos;s order. Once issued, the invoice is due in 7 days and is never
                    edited.
                  </p>
                  <Flex justify="end">
                    <Button
                      variant="primary"
                      disabled={issue.isPending}
                      onClick={() =>
                        issue.mutate(undefined, {
                          onSuccess: (r) =>
                            message.success(`${r.code} issued; ${r.clubName} has it.`),
                          onError: (e) => message.error(apiErrorMessage(e, 'Not issued.')),
                        })
                      }
                    >
                      Issue the invoice · {money(invoice.total, invoice.currency)}
                    </Button>
                  </Flex>
                </Flex>
              </Panel>
            )}
            <InvoiceLines
              invoice={invoice}
              lineAction={(line) =>
                line.actualisable ? (
                  <Button size="sm" variant="ghost" onClick={() => setEditing(line)}>
                    {line.kind === 'ACTUALISED' ? 'Change actual' : 'Set actual'}
                  </Button>
                ) : null
              }
            />
          </Flex>
        </Col>
        <Col xs={24} lg={8}>
          <Flex vertical gap={24}>
            <Panel title="The invoice">
              <Flex vertical gap={12}>
                <Fact label="Against">
                  {invoice.quotationCode} v{invoice.quotationVersion},{' '}
                  {money(invoice.quotationTotal, invoice.currency)}
                </Fact>
                {invoice.jobId && (
                  <Fact label="Job">
                    <Link
                      to={`/staff/jobs/${invoice.jobId}?tab=trip&view=route`}
                      className="text-ink! underline"
                    >
                      {invoice.jobCode}
                    </Link>
                  </Fact>
                )}
                <Fact label="Issued">
                  {invoice.issuedAt
                    ? `${formatDayTime(invoice.issuedAt)}${invoice.issuedByName ? ` by ${invoice.issuedByName}` : ', on acceptance'}`
                    : 'Not yet'}
                </Fact>
                <Fact label="Due">
                  {invoice.dueOn ? formatDate(invoice.dueOn) : '7 days after issue'}
                </Fact>
              </Flex>
            </Panel>
            {owed && <RecordPaymentPanel invoice={invoice} />}
            {!draft && <PaymentsPanel invoice={invoice} />}
          </Flex>
        </Col>
      </Row>
      <ActualModal invoice={invoice} line={editing} onClose={() => setEditing(null)} />
    </Flex>
  );
}
