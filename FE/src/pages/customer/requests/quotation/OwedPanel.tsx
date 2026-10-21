import type { FC } from 'react';

import { Button, Chip, OwedItem, Panel } from '@/components/ui';
import type { CustomerQuotation } from '@/interfaces';
import { daysUntil, deadlineText, formatDate, money, owedKind } from '@/lib/utils';

/** The one owed item: accept or decline before the quotation expires. Accepting comes next release. */
export const OwedPanel: FC<{ quotation: CustomerQuotation }> = ({ quotation }) => {
  const manager = quotation.preparedBy?.name ?? 'The logistics manager';
  const kind = owedKind(quotation.status);
  if (kind === 'accepted' || kind === 'declined') {
    return (
      <Panel
        title="Nothing to answer"
        extra={
          <Chip tone={kind === 'accepted' ? 'ok' : 'neutral'}>
            {kind === 'accepted' ? 'Accepted' : 'Declined'}
          </Chip>
        }
      >
        <p className="type-body-m m-0 text-ink-2">
          {kind === 'accepted'
            ? `You accepted version ${quotation.versionNo}. Its price and horse list hold for this move.`
            : `You declined version ${quotation.versionNo}.`}
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
    <Panel title="1 item" extra={<Chip tone="warn">Waiting for you</Chip>} flush>
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
      />
      <div className="flex items-center gap-3 border-t border-line px-5 py-4">
        <Button variant="secondary" disabled>
          Accept quotation
        </Button>
        <Button variant="secondary" disabled>
          Decline
        </Button>
        <span className="type-body-s text-ink-3">Accepting comes with the next release.</span>
      </div>
    </Panel>
  );
};
