import type { FC } from 'react';

import { GroupBadge } from './GroupBadge';

import { Chip, Panel, QuoteLine } from '@/components/ui';
import type { CustomerQuotation, CustomerQuoteLine } from '@/interfaces';
import { money, moneyOrDash } from '@/lib/utils';

const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

const certainty = (l: CustomerQuoteLine) =>
  l.overridden ? 'overridden' : l.certainty === 'ESTIMATED' ? 'estimated' : 'fixed';

/**
 * The ledger as the customer reads it: groups A–H with subtotals, every line Fixed or Estimated (and
 * why), an overridden line with the catalog amount struck through and the reason, an added line marked
 * Manual. How the air stall was sized sits as a sunken note under the air freight group.
 */
export const CustomerLedger: FC<{ quotation: CustomerQuotation }> = ({ quotation }) => (
  <Panel title="Quotation lines" flush>
    <div className="grid grid-cols-[minmax(0,1fr)_48px_96px_120px_110px] gap-4 bg-sunken px-5 py-3">
      <span className="type-mono-label text-ink-3">Item</span>
      <span className="type-mono-label text-right text-ink-3">Qty</span>
      <span className="type-mono-label text-right text-ink-3">Rate</span>
      <span className="type-mono-label text-right text-ink-3">Amount</span>
      <span />
    </div>
    {quotation.groups.map((g) => (
      <section key={g.code} aria-label={`${g.code} ${g.name}`}>
        <div className="flex items-center gap-3 px-5 pt-4 pb-2">
          <GroupBadge code={g.code} />
          <span className="type-h4 flex-1 text-ink">{g.name}</span>
          <span className="type-data text-ink-2">
            {moneyOrDash(g.subtotal, quotation.currency)}
          </span>
        </div>
        {g.lines.map((l, i) => (
          <QuoteLine
            key={`${g.code}-${i}`}
            certainty={certainty(l)}
            description={
              l.manual ? (
                <span className="flex items-center gap-2">
                  {l.description}
                  <Chip dot={false}>Manual</Chip>
                </span>
              ) : (
                l.description
              )
            }
            basis={l.basisText ?? ''}
            qty={qty(l.quantity)}
            rate={l.unitRate == null ? null : money(l.unitRate, quotation.currency)}
            amount={l.amount == null ? null : money(l.amount, quotation.currency)}
            catalogAmount={
              l.catalogAmount == null ? undefined : money(l.catalogAmount, quotation.currency)
            }
            note={l.overridden ? (l.overrideReason ?? undefined) : (l.estimateNote ?? undefined)}
            extra={
              <>
                {l.overridden && l.estimateNote && (
                  <span className="type-body-s text-warn">{l.estimateNote}</span>
                )}
                {l.manual && l.manualReason && (
                  <span className="type-body-s text-ink-3">{l.manualReason}</span>
                )}
              </>
            }
          />
        ))}
        {g.code === 'C' && quotation.stallNote && (
          <div className="flex flex-col gap-1 border-b border-line bg-sunken px-5 pt-2.5 pb-3.5">
            <span className="type-label-s text-ink-2">How the stall was sized</span>
            <span className="type-body-s text-ink-3">{quotation.stallNote}</span>
          </div>
        )}
      </section>
    ))}
  </Panel>
);
