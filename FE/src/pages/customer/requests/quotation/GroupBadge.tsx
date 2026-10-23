import type { FC } from 'react';
import { Flex } from 'antd';

/** A ledger group's letter; "+" for what is added after the subtotal. */
export const GroupBadge: FC<{ code: string | null }> = ({ code }) => (
  <Flex
    component="span"
    align="center"
    justify="center"
    className="type-mono-chip size-6 shrink-0 rounded-sm bg-muted text-ink-2"
  >
    {code ?? '+'}
  </Flex>
);
