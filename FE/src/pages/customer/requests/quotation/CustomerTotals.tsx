import type { FC } from 'react';

import { Panel } from '@/components/ui';
import type { CustomerQuotation } from '@/interfaces';
import { money, moneyOrDash } from '@/lib/utils';

/** The totals in the fixed order, each percentage naming its base; the volume break is its own row. */
export const CustomerTotals: FC<{ quotation: CustomerQuotation }> = ({ quotation }) => {
  const t = quotation.totals;
  return (
    <Panel title="Totals">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <span className="flex flex-col gap-0.5">
            <span className="type-label-m text-ink">Direct cost subtotal</span>
            <span className="type-caption text-ink-3">Groups A–H</span>
          </span>
          <span className="type-data text-ink">{moneyOrDash(t.subtotal, quotation.currency)}</span>
        </div>
        {t.rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-4">
            <span className="flex flex-col gap-0.5">
              <span className="type-label-m text-ink">{r.label}</span>
              {r.baseText && <span className="type-mono-caption text-ink-3">{r.baseText}</span>}
            </span>
            <span className="type-data text-ink">
              {r.amount == null
                ? '—'
                : `${r.key === 'VOLUME_BREAK' ? '−' : ''}${money(r.amount, quotation.currency)}`}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 border-t border-line pt-3">
          <span className="type-h3 text-ink">{`Total, ${quotation.currency}`}</span>
          <span className="type-display-m text-ink">
            {moneyOrDash(t.total, quotation.currency)}
          </span>
        </div>
      </div>
    </Panel>
  );
};
