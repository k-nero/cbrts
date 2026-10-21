import type { FC } from 'react';

/** A ledger group's letter; "+" for what is added after the subtotal. */
export const GroupBadge: FC<{ code: string | null }> = ({ code }) => (
  <span className="type-mono-chip flex size-6 shrink-0 items-center justify-center rounded-sm bg-muted text-ink-2">
    {code ?? '+'}
  </span>
);
