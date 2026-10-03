import type { FC, ReactNode } from 'react';

import { Icon, type IconName } from './Icon';
import { cx } from './tone';

export type Urgency = 'overdue' | 'soon' | 'upcoming' | 'done';

/* Urgency drives the tone (06-tracking.js, URGENCY): the icon tile, its icon and the time left. */
const URGENCY: Record<Urgency, { tile: string; fg: string; icon: IconName }> = {
  overdue: { tile: 'bg-bad-soft', fg: 'text-bad', icon: 'alert' },
  soon: { tile: 'bg-warn-soft', fg: 'text-warn', icon: 'clock' },
  upcoming: { tile: 'bg-muted', fg: 'text-ink-2', icon: 'upload' },
  done: { tile: 'bg-ok-soft', fg: 'text-ok', icon: 'check' },
};

type Props = {
  urgency: Urgency;
  /** Defaults to the urgency's icon. */
  icon?: IconName;
  title: ReactNode;
  /** What it is about, with its request code: "CBRT-2026-041 · Silver Bell · Proof of ownership". */
  subject?: ReactNode;
  /** The rule, or who asked and why. */
  reason?: ReactNode;
  /** Two lines (DESIGN.md, Two-Line Deadline Rule): time left, then the date. */
  deadline: { left: ReactNode; date: ReactNode };
  /** Only the top item's button is gold; the rest are Secondary. */
  action?: ReactNode;
  className?: string;
};

/**
 * One thing the customer owes (DESIGN.md, Owed Item): a 36 px toned icon tile, title, subject
 * and reason, a two-line deadline, then the action. Rows separate with top hairlines.
 */
export const OwedItem: FC<Props> = ({
  urgency,
  icon,
  title,
  subject,
  reason,
  deadline,
  action,
  className,
}) => {
  const u = URGENCY[urgency];
  return (
    <div
      className={cx('flex items-center gap-4 border-t border-line bg-card px-5 py-4', className)}
    >
      <span className={cx('grid size-9 shrink-0 place-items-center rounded-md', u.tile, u.fg)}>
        <Icon name={icon ?? u.icon} size={18} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className={cx('type-label-m', urgency === 'done' ? 'text-ink-3' : 'text-ink')}>
          {title}
        </span>
        {subject && <span className="type-label-s text-ink-3">{subject}</span>}
        {reason && <span className="type-body-s text-ink-2">{reason}</span>}
      </span>
      <span className="flex w-[140px] shrink-0 flex-col items-end gap-0.5 text-right">
        <span className={cx('type-label-s', u.fg)}>{deadline.left}</span>
        <span className="type-caption text-ink-3">{deadline.date}</span>
      </span>
      {action && <span className="flex shrink-0 items-center justify-end gap-2">{action}</span>}
    </div>
  );
};
