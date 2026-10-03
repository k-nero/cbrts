import type { FC, ReactNode } from 'react';

import { Deadline } from './Deadline';
import { Icon, type IconName } from './Icon';
import { cx, TONE_FG, TONE_SURFACE } from './tone';

export type Urgency = 'overdue' | 'soon' | 'upcoming' | 'done';

const URGENCY = { overdue: 'bad', soon: 'warn', upcoming: 'neutral', done: 'ok' } as const;

type Props = {
  urgency: Urgency;
  icon: IconName;
  title: ReactNode;
  /** What it is about, with its request code: "Nightfall · REQ-2026-0193". */
  subject?: ReactNode;
  /** The rule or who asked and why. */
  reason?: ReactNode;
  deadline: { left: ReactNode; date: ReactNode };
  /** Only the top item's button is gold; the rest are Secondary. */
  action?: ReactNode;
  className?: string;
};

/**
 * One thing the customer owes (DESIGN.md, Owed Item): a toned icon tile, title, subject and
 * reason, a two-line deadline, then the action. Urgency drives the tone.
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
  const tone = URGENCY[urgency];
  return (
    <div
      className={cx(
        'flex items-center gap-4 border-t border-line bg-card px-5 py-4 first:border-t-0',
        className,
      )}
    >
      <span
        className={cx(
          'grid size-9 shrink-0 place-items-center rounded-md border',
          TONE_SURFACE[tone],
          TONE_FG[tone],
        )}
      >
        <Icon name={icon} size={18} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="type-label-m text-ink">{title}</span>
        {subject && <span className="type-label-s text-ink-3">{subject}</span>}
        {reason && <span className="type-body-s text-ink-2">{reason}</span>}
      </span>
      <Deadline left={deadline.left} date={deadline.date} tone={tone} />
      {action && <span className="flex shrink-0 justify-end">{action}</span>}
    </div>
  );
};
