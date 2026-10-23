import type { FC, ReactNode } from 'react';

import { Icon } from './Icon';
import { cx, TONE_FG, TONE_SURFACE } from './tone';

type Props = {
  state: 'locked' | 'clear' | 'departed';
  title?: ReactNode;
  /** What is outstanding, or that every mandatory item is cleared. */
  children?: ReactNode;
  /** A Secondary action ("View outstanding items"). */
  action?: ReactNode;
  className?: string;
};

/**
 * The hard gate between clearance and the trip (DESIGN.md, Clearance Gate), on every operations
 * screen. Clear only when every mandatory item is GREEN and approved and quarantine is complete.
 */
export const ClearanceGate: FC<Props> = ({ state, title, children, action, className }) => {
  const tone = state === 'locked' ? 'bad' : 'ok';
  const defaultIcon = state === 'locked' ? 'lock' : state === 'departed' ? 'truck' : 'unlock';
  const defaultTitle =
    state === 'locked' ? 'Departure locked' : state === 'departed' ? 'Departed' : 'Clear to depart';

  return (
    <div
      className={cx(
        'flex items-center gap-5 rounded-lg border px-6 py-5',
        TONE_SURFACE[tone],
        className,
      )}
    >
      <span
        className={cx(
          'grid size-12 shrink-0 place-items-center rounded-full bg-card',
          TONE_FG[tone],
        )}
      >
        <Icon name={defaultIcon} size={22} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="type-h3 text-ink">{title ?? defaultTitle}</span>
        {children && <span className="type-body-s text-ink-2">{children}</span>}
      </span>
      {action}
    </div>
  );
};
