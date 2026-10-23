import type { FC } from 'react';
import { Flex } from 'antd';

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
      <Flex component="ol" vertical gap={14} className="list-none">
        {steps.map(([title, sub], i) => (
          <Flex component="li" align="start" gap={14} key={title}>
            <Flex
              component="span"
              align="center"
              justify="center"
              className="type-mono-caption size-6.5 shrink-0 rounded-full border border-line-strong text-ink-3"
            >
              {i + 1}
            </Flex>
            <Flex component="span" vertical gap={2}>
              <span className="type-label-s text-ink">{title}</span>
              <span className="type-body-s text-ink-3">{sub}</span>
            </Flex>
          </Flex>
        ))}
      </Flex>
    </Panel>
  );
};
