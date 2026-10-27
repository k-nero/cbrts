import { type FC, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Flex } from 'antd';

import CancelRequestModal from '../CancelRequestModal';
import { AcceptQuotationModal } from './AcceptQuotationModal';
import { DeclineQuotationModal } from './DeclineQuotationModal';
import { RequoteModal } from './RequoteModal';

import { Button, Callout, Chip, OwedItem, Panel } from '@/components/ui';
import { queryKeys } from '@/constant/query';
import type { CustomerQuotation } from '@/interfaces';
import {
  cancellationToday,
  cancelledText,
  deadlineText,
  expiredSentence,
  formatDate,
  holdsReason,
  ict,
  money,
  owedKind,
} from '@/lib/utils';

/**
 * The one owed item (DESIGN.md, Quotation page): accept or decline before the quotation expires,
 * with the request's cancellation beneath it until the job is approved (BR-F1-07).
 */
export const OwedPanel: FC<{ quotation: CustomerQuotation }> = ({ quotation }) => {
  const [open, setOpen] = useState<'accept' | 'decline' | 'cancel' | 'requote' | null>(null);
  // A newer version was issued while this page was open: the server's sentence, above what reloads.
  const [changed, setChanged] = useState<string | null>(null);
  const qc = useQueryClient();
  const manager = quotation.preparedBy?.name ?? 'The logistics manager';
  const kind = owedKind(quotation, ict(new Date().toISOString()).format('YYYY-MM-DD'));
  const close = () => setOpen(null);
  const onVersionChanged = (sentence: string) => {
    setChanged(sentence);
    // The request's key prefixes its quotation's: the page, its next step and the quotation all reload.
    void qc.invalidateQueries({ queryKey: queryKeys.requests.one(quotation.request.id) });
    void qc.invalidateQueries({ queryKey: queryKeys.requests.pages() });
  };
  const changedCallout = changed && <Callout tone="warn" title={changed} />;

  const cancelFooter = (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen('cancel')}>
        Cancel this request
      </Button>
      <CancelRequestModal
        requestId={quotation.request.id}
        code={quotation.request.code}
        fee={cancellationToday(quotation)}
        open={open === 'cancel'}
        onClose={close}
      />
    </>
  );

  if (quotation.requestStatus === 'CANCELLED') {
    return (
      <Panel title="Nothing to answer" extra={<Chip dot={false}>Cancelled</Chip>}>
        <p className="type-body-m m-0 text-ink-2">
          {cancelledText(quotation.cancelledAt, quotation.cancellationFeePct, true)}
        </p>
      </Panel>
    );
  }
  if (kind === 'accepted' || kind === 'declined') {
    const accepted = kind === 'accepted';
    const on = accepted ? quotation.acceptedAt : quotation.declinedAt;
    return (
      <Panel
        title="Nothing to answer"
        extra={<Chip tone={accepted ? 'ok' : 'neutral'}>{accepted ? 'Accepted' : 'Declined'}</Chip>}
        footer={
          accepted && quotation.requestStatus === 'CUSTOMER_ACCEPTED' ? cancelFooter : undefined
        }
      >
        <p className="type-body-m m-0 text-ink-2">
          {accepted && quotation.requestStatus === 'APPROVED'
            ? `You accepted version ${quotation.versionNo}${on ? ` on ${formatDate(on)}` : ''} and ${manager} approved the job. The price and the horse list are locked; your document checklist is open.`
            : accepted
              ? `You accepted version ${quotation.versionNo}${on ? ` on ${formatDate(on)}` : ''}. Next, ${manager} approves the job, which locks the price and the horse list.`
              : `You declined version ${quotation.versionNo}${on ? ` on ${formatDate(on)}` : ''}, so ${quotation.request.code} is closed.`}
        </p>
      </Panel>
    );
  }
  if (kind === 'expired') {
    return (
      <Panel title="Nothing to answer" extra={<Chip dot={false}>Expired</Chip>}>
        <p className="type-body-m m-0 text-ink-2">
          {expiredSentence(quotation, 'expired', manager)}
        </p>
      </Panel>
    );
  }
  // A4: the customer asks for a new version; once asked, the manager is preparing it.
  if (kind === 'requote') {
    return (
      <Panel title="Nothing to answer" extra={<Chip dot={false}>Expired</Chip>}>
        <Flex vertical gap={12} align="start">
          <p className="type-body-m m-0 text-ink-2">
            {expiredSentence(quotation, 'requote', manager)}
          </p>
          <Button variant="secondary" onClick={() => setOpen('requote')}>
            Ask for a re-quote
          </Button>
        </Flex>
        <RequoteModal quotation={quotation} open={open === 'requote'} onClose={close} />
      </Panel>
    );
  }
  if (kind === 'requoting') {
    return (
      <Panel title="Nothing to answer" extra={<Chip tone="neutral">Re-quote asked</Chip>}>
        <p className="type-body-m m-0 text-ink-2">
          {`${manager} is preparing version ${quotation.nextVersion}. You'll be notified when it's issued.`}
        </p>
      </Panel>
    );
  }
  const issued = quotation.issuedAt;
  const until = quotation.validUntil;
  const deadline = until
    ? deadlineText(until, new Date().toISOString())
    : { line1: '—', line2: '' };
  return (
    <Flex vertical gap={16}>
      {changedCallout}
      <Panel
        title={
          <Flex vertical gap={4}>
            <h2 className="type-h3 m-0 text-ink">You owe 1 item</h2>
            <span className="type-body-s text-ink-2">
              {`${manager}, logistics manager, issued version ${quotation.versionNo}${issued ? ` on ${formatDate(issued)}` : ''}. Accepting locks the price and the horse list; declining closes the request.`}
            </span>
          </Flex>
        }
        extra={<Chip tone="warn">Waiting for you</Chip>}
        footer={cancelFooter}
        flush
      >
        <OwedItem
          urgency="soon"
          title="Accept or decline this quotation"
          subject={`${quotation.code} · version ${quotation.versionNo} · ${
            quotation.totals.total == null ? '—' : money(quotation.totals.total, quotation.currency)
          }`}
          reason={issued && until ? holdsReason(issued, until, manager) : undefined}
          deadline={{ left: deadline.line1, date: deadline.line2 }}
          action={
            <>
              <Button variant="primary" leadingIcon="check" onClick={() => setOpen('accept')}>
                Accept quotation
              </Button>
              <Button variant="secondary" onClick={() => setOpen('decline')}>
                Decline
              </Button>
            </>
          }
        />
        <AcceptQuotationModal
          quotation={quotation}
          open={open === 'accept'}
          onClose={close}
          onVersionChanged={onVersionChanged}
        />
        <DeclineQuotationModal
          quotation={quotation}
          open={open === 'decline'}
          onClose={close}
          onVersionChanged={onVersionChanged}
        />
      </Panel>
    </Flex>
  );
};
