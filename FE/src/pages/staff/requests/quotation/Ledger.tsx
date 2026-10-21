import type { FC } from 'react';

import { Panel, QuoteLine } from '@/components/ui';
import type { QuotationDraft, QuoteLineRow } from '@/interfaces';
import { money, moneyOrDash } from '@/lib/utils';

const certainty = (line: QuoteLineRow) =>
  line.certainty === 'ESTIMATED'
    ? 'estimated'
    : line.certainty === 'OVERRIDDEN'
      ? 'overridden'
      : 'fixed';

const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/** The ledger (DESIGN.md, Quotation builder): groups A–H with letter badges and subtotals, then the lines. */
export const Ledger: FC<{ quotation: QuotationDraft }> = ({ quotation }) => (
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
          <span className="type-mono-chip flex size-6 items-center justify-center rounded-sm bg-muted text-ink-2">
            {g.code}
          </span>
          <span className="type-h4 flex-1 text-ink">{g.name}</span>
          <span className="type-data text-ink-2">
            {moneyOrDash(g.subtotal, quotation.currency)}
          </span>
        </div>
        {g.lines.map((l, i) => (
          <QuoteLine
            key={`${g.code}-${i}`}
            certainty={certainty(l)}
            description={l.description}
            basis={l.basisText}
            qty={qty(l.quantity)}
            rate={l.unitRate == null ? null : money(l.unitRate, quotation.currency)}
            amount={l.amount == null ? null : money(l.amount, quotation.currency)}
            note={l.estimateNote ?? undefined}
          />
        ))}
      </section>
    ))}
  </Panel>
);
