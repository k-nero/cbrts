import { Flex } from 'antd';
import type { FC } from 'react';

import { Panel } from '@/components/ui';
import type { QuotationDraft } from '@/interfaces';
import { money, moneyOrDash } from '@/lib/utils';

/** Totals in the fixed order, each percentage row naming its base. */
export const TotalsPanel: FC<{ quotation: QuotationDraft }> = ({ quotation }) => {
  const t = quotation.totals;
  const currency = quotation.currency;
  // A request that changed since pricing has no agreed total: the server drops the totals rows, so the
  // subtotal and total read "—" with them until the draft is re-priced.
  const stale = quotation.repriceNeeded;
  return (
    <Panel title="Totals">
      <Flex vertical gap={12}>
        <Flex gap={16} align="center" justify="space-between">
          <Flex component="span" vertical gap={2}>
            <span className="type-label-m text-ink">
              {t.subtotal == null ? 'Priced lines' : 'Direct cost subtotal'}
            </span>
            <span className="type-caption text-ink-3">Groups A–H</span>
          </Flex>
          <span className="type-data text-ink">
            {stale ? '—' : money(t.subtotal ?? t.pricedLines, currency)}
          </span>
        </Flex>
        {t.rows.map((r) => (
          <Flex gap={16} align="center" justify="space-between" key={r.key}>
            <Flex component="span" vertical gap={2}>
              <span className="type-label-m text-ink">{r.label}</span>
              <span className="type-caption text-ink-3">{r.baseText}</span>
            </Flex>
            <span className="type-data text-ink">
              {r.amount == null
                ? '—'
                : `${r.key === 'VOLUME_BREAK' ? '−' : ''}${money(r.amount, currency)}`}
            </span>
          </Flex>
        ))}
        <div className="pt-3 border-t border-line">
          <Flex gap={16} align="center" justify="space-between">
            <span className="type-h3 text-ink">{`Total, ${quotation.currency}`}</span>
            <span className="type-display-m text-ink">
              {stale ? '—' : moneyOrDash(t.total, currency)}
            </span>
          </Flex>
        </div>
        {quotation.status === 'DRAFT' && quotation.previous?.total != null && (
          <span className="type-mono-caption self-end text-ink-3">
            {`v${quotation.previous.versionNo} total ${money(quotation.previous.total, currency)}`}
          </span>
        )}
        <p className="type-body-s m-0 text-ink-3">
          {`Applied in a fixed order: the volume break on air and ground lines, fuel on the discounted air lines, insurance on declared value, then contingency, then the service fee. Rate catalog v${quotation.pinnedVersion.versionNo} is pinned to this quotation.`}
        </p>
      </Flex>
    </Panel>
  );
};
