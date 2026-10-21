import type { FC } from 'react';

import { GroupBadge } from './GroupBadge';

import { Panel } from '@/components/ui';
import type { CustomerQuotation } from '@/interfaces';
import { money, moneyHead, moneyRows, shareText } from '@/lib/utils';

/**
 * Where the money goes (DESIGN.md, Quotation page): one row per ledger group plus fees, fuel and cover,
 * largest first, each a single-hue bar on a muted track. One series, so no legend.
 */
export const MoneyPanel: FC<{ quotation: CustomerQuotation }> = ({ quotation }) => {
  const { subtotal, total } = quotation.totals;
  if (subtotal == null || total == null || total <= 0) return null;
  const rows = moneyRows(quotation.groups, { subtotal, total });
  if (rows.length === 0) return null;
  return (
    <Panel title="Where the money goes">
      <div className="flex flex-col gap-3">
        <p className="type-body-m m-0 text-ink-2">{moneyHead(rows)}</p>
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-3">
            <GroupBadge code={r.code} />
            <span className="type-label-s min-w-[96px] flex-1 truncate text-ink" title={r.name}>
              {r.name}
            </span>
            <span
              aria-hidden
              className="h-1 w-[220px] min-w-10 shrink overflow-hidden rounded bg-muted"
            >
              <span
                className="block h-full rounded bg-ink-2"
                style={{ width: `${Math.max(r.share * 100, 1)}%` }}
              />
            </span>
            <span className="type-data w-28 shrink-0 text-right text-ink">
              {money(r.amount, quotation.currency)}
            </span>
            <span className="type-mono-caption w-10 shrink-0 text-right text-ink-3">
              {shareText(r.share)}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
};
