import { type FC, useState } from 'react';
import { Flex } from 'antd';

import { BestPriceModal } from './BestPriceModal';
import type { RunWrite } from './editorOptions';

import { Button, Callout } from '@/components/ui';
import type { QuotationDraft } from '@/interfaces';
import { formatDate, money } from '@/lib/utils';

/**
 * The club's open counter-offer (spec 2026-11-23): what it asks on which lines and why. On the issued
 * version the manager answers with a revision (Revise, as before) or "best price"; on the revision draft
 * the asks sit beside each line, and issuing the draft answers it.
 */
export const CounterOfferPanel: FC<{
  quotation: QuotationDraft;
  draft: boolean;
  run: RunWrite;
}> = ({ quotation: q, draft, run }) => {
  const [open, setOpen] = useState(false);
  const offer = q.counterOffer;
  if (!offer || offer.status !== 'OPEN') return null;
  const club = offer.createdBy ?? 'The club';
  // Past its last valid day the club can't accept it, even before the hourly expiry job marks it expired.
  const live =
    q.status === 'ISSUED' && (!q.validUntil || new Date(q.validUntil).getTime() > Date.now());
  const canAnswer = !draft && live;
  return (
    <Callout
      tone="info"
      title={`${club} asks for a better price on v${offer.versionNo} (${formatDate(offer.createdAt)})`}
      action={
        canAnswer ? (
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
            Answer: best price
          </Button>
        ) : undefined
      }
    >
      <Flex vertical gap={6}>
        {offer.message && <span>{`“${offer.message}”`}</span>}
        {offer.lines.map((l) => (
          <span key={l.lineKey}>
            {`${l.description}: ${money(l.quotedAmount, q.currency)} → ${money(l.askedAmount, q.currency)} · “${l.reason}”`}
          </span>
        ))}
        <span className="text-ink-3">
          {draft
            ? 'Use the club’s price on a line, or your own, with a reason. Issuing this version answers the counter-offer.'
            : live
              ? 'Revise this version to answer with a new one, or answer that this is your best price.'
              : 'This version has expired: revise it to answer with a new one.'}
        </span>
      </Flex>
      {canAnswer && (
        <BestPriceModal
          requestId={q.request.id}
          versionNo={q.versionNo}
          club={club}
          open={open}
          run={run}
          onClose={() => setOpen(false)}
        />
      )}
    </Callout>
  );
};
