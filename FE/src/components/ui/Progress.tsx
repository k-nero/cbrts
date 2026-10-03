import type { FC } from 'react';

import { cx, Tone } from './tone';

export type ProgressTone = Exclude<Tone, 'info'>;

const BAR: Record<ProgressTone, string> = {
  neutral: 'bg-ink-3',
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
};

type Props = {
  /** 0 to 100. */
  value: number;
  /** Neutral for a plain proportion such as payload or documents cleared. */
  tone?: ProgressTone;
  /** Accessible name; the visible words ("3 of 5 cleared") sit beside the bar. */
  label: string;
  className?: string;
};

/** A readiness or payload bar on a Muted Navy track. Never colour alone: say the figure next to it. */
export const Progress: FC<Props> = ({ value, tone = 'neutral', label, className }) => {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      className={cx('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <div className={cx('h-full rounded-full', BAR[tone])} style={{ width: `${v}%` }} />
    </div>
  );
};
