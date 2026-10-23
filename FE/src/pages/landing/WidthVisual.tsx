import { Flex } from 'antd';
import type { FC } from 'react';

import { Visual } from './Visual';

import { cx } from '@/components/ui';

const STALL_ROWS: [string, number, string][] = [
  ['Economy', 3, '3 × 32 in'],
  ['Business', 2, '2 × 48 in'],
  ['First', 1, '1 × 96 in'],
];

/** One 96 in air position holds three, two or one horse by class. */
export const WidthVisual: FC = () => (
  <Visual
    label="One 96 inch air stall position: three horses in Economy, two in Business, one in First"
    justify="center"
    gap={10}
  >
    {STALL_ROWS.map(([cls, n, caption]) => (
      <Flex key={cls} component="span" align="center" gap={10}>
        <span className="type-body-s w-16 shrink-0 text-ink-2">{cls}</span>
        <Flex component="span" gap={3} className="h-[18px] flex-1" aria-hidden>
          {Array.from({ length: n }, (_, i) => (
            <span
              key={i}
              className={cx('flex-1 rounded-sm', i === 0 ? 'bg-stall-standard' : 'bg-stall-box')}
            />
          ))}
        </Flex>
        <span className="type-caption shrink-0 text-ink-3">{caption}</span>
      </Flex>
    ))}
  </Visual>
);
