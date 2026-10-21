import type { FC } from 'react';

import { DlRow } from './DlRow';

import { Chip, Panel } from '@/components/ui';
import type { CustomerQuotation } from '@/interfaces';
import {
  depositText,
  estimateVerdict,
  largestLine,
  money,
  rangeText,
  shareText,
} from '@/lib/utils';

/** The quote against the range kept at submission; it doesn't repeat the total. */
export const AgainstEstimate: FC<{ quotation: CustomerQuotation }> = ({ quotation }) => {
  const verdict = estimateVerdict(quotation.estimate);
  const total = quotation.totals.total ?? 0;
  const top = total > 0 ? largestLine(quotation.groups, total) : null;
  const estimated = quotation.groups
    .flatMap((g) => g.lines)
    .filter((l) => l.certainty === 'ESTIMATED')
    .map((l) => l.description);
  return (
    <Panel>
      <div className="flex flex-col gap-3">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="type-h4 text-ink">Against your estimate</span>
          {verdict && <Chip tone={verdict.tone}>{verdict.label}</Chip>}
        </span>
        {quotation.estimate ? (
          <DlRow
            label="Your estimate at submission"
            value={rangeText(quotation.estimate.low, quotation.estimate.high)}
          />
        ) : (
          <span className="type-body-s text-ink-3">
            No estimate was shown when you submitted this request.
          </span>
        )}
        {quotation.deposit && (
          <DlRow
            label="Deposit on acceptance"
            value={depositText(quotation.deposit, quotation.currency)}
          />
        )}
        <span className="type-body-s text-ink-3">
          {[
            top
              ? `The largest line is ${top.description}, ${money(top.amount, quotation.currency)}, or ${shareText(top.share)} of the total.`
              : null,
            estimated.length > 0
              ? `${estimated.join(', ')} ${estimated.length === 1 ? 'is the only line' : 'are the lines'} that can change on the final invoice.`
              : 'Every line is fixed: none can change on the final invoice.',
          ]
            .filter(Boolean)
            .join(' ')}
        </span>
      </div>
    </Panel>
  );
};
