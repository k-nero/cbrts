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
  <Visual label="Three quotation lines: two fixed, one estimated" className="gap-2.5">
    {QUOTE_ROWS.map(([line, tone, tag, amount]) => (
      <span key={line} className="flex items-center gap-2.5">
        <span className="type-body-s flex-1 text-ink">{line}</span>
        <Chip tone={tone} dot={false}>
          {tag}
        </Chip>
        <span className="type-caption w-[60px] shrink-0 text-right text-ink">{amount}</span>
      </span>
    ))}
  </Visual>
);
