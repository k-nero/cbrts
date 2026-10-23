import { type FC, useState } from 'react';
import { Flex } from 'antd';

import CancelRequestModal from '../CancelRequestModal';
import { AcceptQuotationModal } from './AcceptQuotationModal';
import { DeclineQuotationModal } from './DeclineQuotationModal';

import { Button, Chip, OwedItem, Panel } from '@/components/ui';
import type { CustomerQuotation } from '@/interfaces';
import {
  cancellationToday,
  cancelledText,
  daysUntil,
  deadlineText,
  formatDate,
  money,
  owedKind,
} from '@/lib/utils';

/**
 * The one owed item (DESIGN.md, Quotation page): accept or decline before the quotation expires,
 * with the request's cancellation beneath it until the job is approved (BR-F1-07).
 */
export const OwedPanel: FC<{ quotation: CustomerQuotation }> = ({ quotation }) => {
  const [open, setOpen] = useState<'accept' | 'decline' | 'cancel' | null>(null);
  const manager = quotation.preparedBy?.name ?? 'The logistics manager';
  const kind = owedKind(quotation.status);
  const close = () => setOpen(null);

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
          {cancelledText(quotation.cancelledAt, quotation.cancellationFeePct)}
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
          {accepted
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
          {`This quotation expired on ${quotation.validUntil ? formatDate(quotation.validUntil) : '—'}. ${manager} can re-price it from the rate catalog in force now.`}
        </p>
      </Panel>
    );
  }
  const issued = quotation.issuedAt;
  const until = quotation.validUntil;
  const days = issued && until ? daysUntil(until, issued) : null;
  const deadline = until
    ? deadlineText(until, new Date().toISOString())
    : { line1: '—', line2: '' };
  return (
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
        reason={
          days != null && issued && until
            ? `It holds its price for ${days} days from ${formatDate(issued)}. After ${formatDate(until)} it expires and ${manager} re-prices it from the rate catalog in force then.`
            : undefined
        }
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
      <AcceptQuotationModal quotation={quotation} open={open === 'accept'} onClose={close} />
      <DeclineQuotationModal quotation={quotation} open={open === 'decline'} onClose={close} />
    </Panel>
  );
};
