import type { FC, ReactNode } from 'react';

/** A row that is set by a profile or a rule, not chosen: a lock or a fixed tick, then the rule. */
export const FactRow: FC<{ lead: ReactNode; title: string; sub: string; first?: boolean }> = ({
  lead,
  title,
  sub,
  first,
}) => (
  <div className={`flex items-center gap-3.5 px-4.5 py-3.5 ${first ? '' : 'border-t border-line'}`}>
    {lead}
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="type-label-m text-ink">{title}</span>
      <span className="type-body-s text-ink-3">{sub}</span>
    </span>
  </div>
);
