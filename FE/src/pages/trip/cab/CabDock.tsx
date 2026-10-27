import type { FC, ReactNode } from 'react';

import { Button } from '@/components/ui';

type Props = {
  summary: ReactNode;
  sub: ReactNode;
  /** The one gold action, under the thumb; none while there is nothing to record. */
  action?: { label: ReactNode; onClick: () => void; disabled?: boolean };
  secondary?: { label: ReactNode; onClick: () => void };
};

/** The dock at the bottom edge: what will be saved, and the 64-high gold action. */
export const CabDock: FC<Props> = ({ summary, sub, action, secondary }) => (
  <div className="sticky bottom-0 z-10 -mx-10 mt-2 flex items-center gap-5 border-t border-line-strong bg-card px-10 pt-4 pb-5">
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="type-label-m text-ink">{summary}</span>
      <span className="type-body-s text-ink-2">{sub}</span>
    </div>
    {secondary && (
      <Button className="h-16 px-5" onClick={secondary.onClick}>
        {secondary.label}
      </Button>
    )}
    {action && (
      // Unavailable is a disabled Secondary, never a faded gold (DESIGN.md, Buttons).
      <Button
        variant={action.disabled ? 'secondary' : 'primary'}
        leadingIcon="check"
        className="h-16 w-[440px] max-w-full"
        disabled={action.disabled}
        onClick={action.onClick}
      >
        {action.label}
      </Button>
    )}
  </div>
);
