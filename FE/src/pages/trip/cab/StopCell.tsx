import type { FC } from 'react';

import type { StopCell as Cell, StopState } from './cabState';

import { cx } from '@/components/ui';

const DOT: Record<StopState, string> = {
  done: 'bg-ok',
  current: 'bg-info',
  held: 'bg-bad',
  upcoming: 'bg-line-strong',
};

/** One stop of the route, big enough to read from the seat: stop, kind, and its time at 28 px. */
export const StopCell: FC<{ cell: Cell; state: StopState }> = ({ cell, state }) => {
  const now = state === 'current' || state === 'held';
  return (
    <li
      aria-current={now ? 'step' : undefined}
      className={cx(
        'flex min-w-44 flex-1 flex-col gap-1 rounded-lg px-4 py-3.5',
        state === 'current' && 'border-[1.5px] border-info-line bg-info-soft',
        state === 'held' && 'border-[1.5px] border-bad-line bg-bad-soft',
        !now && 'border border-line bg-card',
      )}
    >
      <span className="flex items-center gap-2">
        <span aria-hidden className={cx('size-2.5 shrink-0 rounded-full', DOT[state])} />
        <span className="type-label-m truncate text-ink">{cell.name}</span>
      </span>
      <span className="type-body-s text-ink-2">{cell.kind}</span>
      <span className={cx('type-data-l', state === 'done' ? 'text-ink-2' : 'text-ink')}>
        {cell.time}
      </span>
      <span
        className={cx(
          'type-body-s',
          state === 'current' ? 'text-info' : state === 'held' ? 'text-bad' : 'text-ink-3',
        )}
      >
        {cell.note}
      </span>
    </li>
  );
};
