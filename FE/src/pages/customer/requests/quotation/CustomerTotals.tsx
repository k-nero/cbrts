import type { FC } from 'react';
import { Flex } from 'antd';

import { Panel } from '@/components/ui';
import type { CustomerQuotation } from '@/interfaces';
import { money, moneyOrDash } from '@/lib/utils';

/** The totals in the fixed order, each percentage naming its base; the volume break is its own row. */
export const CustomerTotals: FC<{ quotation: CustomerQuotation }> = ({ quotation }) => {
  const t = quotation.totals;
  return (
    <Panel title="Totals">
      <Flex vertical gap={12}>
        <Flex align="center" justify="space-between" gap={16}>
          <Flex component="span" vertical gap={2}>
            <span className="type-label-m text-ink">Direct cost subtotal</span>
            <span className="type-caption text-ink-3">Groups A–H</span>
          </Flex>
          <span className="type-data text-ink">{moneyOrDash(t.subtotal, quotation.currency)}</span>
        </Flex>
        {t.rows.map((r) => (
          <Flex align="center" justify="space-between" gap={16} key={r.key}>
            <Flex component="span" vertical gap={2}>
              <span className="type-label-m text-ink">{r.label}</span>
              {r.baseText && <span className="type-mono-caption text-ink-3">{r.baseText}</span>}
            </Flex>
            <span className="type-data text-ink">
              {r.amount == null
                ? '—'
                : `${r.key === 'VOLUME_BREAK' ? '−' : ''}${money(r.amount, quotation.currency)}`}
            </span>
          </Flex>
        ))}
        <div className="border-t border-line pt-3">
          <Flex align="center" justify="space-between" gap={16}>
            <span className="type-h3 text-ink">{`Total, ${quotation.currency}`}</span>
            <span className="type-display-m text-ink">
              {moneyOrDash(t.total, quotation.currency)}
            </span>
          </Flex>
        </div>
      </Flex>
    </Panel>
  );
};
