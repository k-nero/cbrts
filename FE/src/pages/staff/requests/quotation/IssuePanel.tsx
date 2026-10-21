import type { FC } from 'react';

import { Button, Chip, Panel } from '@/components/ui';
import type { QuotationDraft } from '@/interfaces';
import { moneyOrDash, readinessView, repriceOffer } from '@/lib/utils';

/** The issue panel: total, validity said twice, currency, readiness. Issuing comes with the next step. */
export const IssuePanel: FC<{
  quotation: QuotationDraft;
  repricing: boolean;
  onReprice: () => void;
}> = ({ quotation, repricing, onReprice }) => {
  const offer = repriceOffer(quotation);
  const readiness = readinessView(quotation);
  return (
    <Panel>
      <div className="flex flex-col gap-3">
        <span className="type-h4 text-ink">{`Issue version ${quotation.versionNo}`}</span>
        <div className="flex items-center justify-between gap-4">
          <span className="type-body-s text-ink-2">Total</span>
          <span className="type-data text-ink">
            {quotation.repriceNeeded
              ? '—'
              : moneyOrDash(quotation.totals.total, quotation.currency)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="type-body-s text-ink-2">Validity</span>
          <span className="flex flex-col items-end gap-0.5">
            <span className="type-label-s text-ink">
              {quotation.validityDays == null ? '—' : `In ${quotation.validityDays} days`}
            </span>
            <span className="type-caption text-ink-3">from issue</span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="type-body-s text-ink-2">Currency</span>
          <span className="type-label-s text-ink">{`${quotation.currency} · FX pinned at issue`}</span>
        </div>
        <div className="flex items-center gap-3 border-t border-line pt-3">
          {readiness.tone === 'ok' ? (
            <Chip tone="ok">{readiness.chip}</Chip>
          ) : (
            <Chip dot={false}>{readiness.chip}</Chip>
          )}
          <span className="type-body-s text-ink-2">{readiness.text}</span>
        </div>
        <Button variant="secondary" block disabled>
          Issue quotation
        </Button>
        <span className="type-body-s text-ink-3">
          Issuing comes with the next release of Flow 1.
        </span>
        {(offer || quotation.repriceNeeded) && (
          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <span className="type-body-s text-ink-2">
              {offer
                ? `Rate catalog v${quotation.latestPublishedVersionNo} is published.`
                : 'Re-price to work it out again from the request as it is now.'}
            </span>
            <Button variant="secondary" block disabled={repricing} onClick={onReprice}>
              {offer ?? 'Re-price'}
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
};
