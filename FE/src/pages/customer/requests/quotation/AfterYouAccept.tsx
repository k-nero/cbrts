import type { FC } from 'react';

import { Panel } from '@/components/ui';
import type { CustomerQuotation } from '@/interfaces';
import { depositText } from '@/lib/utils';

/** What happens after accepting, in three numbered steps. */
export const AfterYouAccept: FC<{ quotation: CustomerQuotation }> = ({ quotation }) => {
  const manager = quotation.preparedBy?.name ?? 'The logistics manager';
  const steps: [string, string][] = [
    [
      'Your deposit is acknowledged',
      quotation.deposit ? depositText(quotation.deposit, quotation.currency) : 'From the quotation',
    ],
    [`${manager} approves the job and it gets its CBRT code`, 'Price and horses lock'],
    [
      'Your document checklist opens',
      `${quotation.request.horses.length} ${quotation.request.horses.length === 1 ? 'horse' : 'horses'}`,
    ],
  ];
  return (
    <Panel title="After you accept">
      <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
        {steps.map(([title, sub], i) => (
          <li key={title} className="flex items-start gap-3.5">
            <span className="type-mono-caption flex size-6.5 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-3">
              {i + 1}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="type-label-s text-ink">{title}</span>
              <span className="type-body-s text-ink-3">{sub}</span>
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  );
};
