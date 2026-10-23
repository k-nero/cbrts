import type { FC, ReactNode } from 'react';
import { Flex } from 'antd';

/** A row that is set by a profile or a rule, not chosen: a lock or a fixed tick, then the rule. */
export const FactRow: FC<{ lead: ReactNode; title: string; sub: string; first?: boolean }> = ({
  lead,
  title,
  sub,
  first,
}) => (
  <div className={`px-4.5 py-3.5 ${first ? '' : 'border-t border-line'}`}>
    <Flex align="center" gap={14}>
      {lead}
      <Flex component="span" vertical gap={2} className="min-w-0">
        <span className="type-label-m text-ink">{title}</span>
        <span className="type-body-s text-ink-3">{sub}</span>
      </Flex>
    </Flex>
  </div>
);
