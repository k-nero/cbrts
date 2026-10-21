import type { FC } from 'react';

import { cx } from './tone';

/* A leg turns green only between confirmed checkpoints: positions come from recorded checkpoints, never a guess. */
export const Leg: FC<{ confirmed: boolean }> = ({ confirmed }) => (
  <span aria-hidden className="flex-1 pt-[9px]">
    <span className={cx('block h-0.5 w-full', confirmed ? 'bg-ok' : 'bg-line-strong')} />
  </span>
);
