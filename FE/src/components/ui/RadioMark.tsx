import type { FC } from 'react';

import { cx } from './tone';

/** The radio circle alone. */
export const RadioMark: FC<{ checked: boolean; className?: string }> = ({ checked, className }) => (
  <span
    aria-hidden
    className={cx(
      'grid size-5 shrink-0 place-items-center rounded-full bg-input',
      checked ? 'border-[1.5px] border-ink' : 'border border-line-strong',
      className,
    )}
  >
    {checked && <span className="size-2.5 rounded-full bg-ink" />}
  </span>
);
