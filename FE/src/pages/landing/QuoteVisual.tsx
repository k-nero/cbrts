import { Flex } from 'antd';
import type { FC } from 'react';

import { Visual } from './Visual';

import { Chip, type Tone } from '@/components/ui';

const QUOTE_ROWS: [string, Tone, string, string][] = [
  ['Air stall position', 'neutral', 'Fixed', '$16,800'],
  ['Pre-export isolation', 'neutral', 'Fixed', '$2,170'],
  ['Waiting time, 2 h', 'warn', 'Estimated', '$190'],
];

/** Quote lines say which can move on the final invoice. */
export const QuoteVisual: FC = () => (
  <Visual label="Three quotation lines: two fixed, one estimated" gap={10}>
    {QUOTE_ROWS.map(([line, tone, tag, amount]) => (
      <Flex key={line} component="span" align="center" gap={10}>
        <span className="type-body-s flex-1 text-ink">{line}</span>
        <Chip tone={tone} dot={false}>
          {tag}
        </Chip>
        <span className="type-caption w-[60px] shrink-0 text-right text-ink">{amount}</span>
      </Flex>
    ))}
  </Visual>
);
