import type { FC, ReactNode } from 'react';

import { cx, Tone, TONE_FIGURE } from './tone';

type Props = {
  /** Time left, toned by urgency: "Overdue by 1 day", "Due in 4 days". */
  left: ReactNode;
  /** The date beneath it: "30 Sep 2026". */
  date: ReactNode;
  /** Overdue bad, soon warn, upcoming neutral, done ok. */
  tone?: Tone;
  align?: 'start' | 'end';
  className?: string;
};

/** Every deadline is shown twice (DESIGN.md, Two-Line Deadline Rule): time left, then the date. */
export const Deadline: FC<Props> = ({ left, date, tone = 'neutral', align = 'end', className }) => (
  <span
    className={cx(
      'flex shrink-0 flex-col gap-0.5',
      align === 'end' ? 'items-end text-right' : 'items-start',
      className,
    )}
  >
    <span className={cx('type-label-s', TONE_FIGURE[tone])}>{left}</span>
    <span className="type-caption text-ink-3">{date}</span>
  </span>
);
