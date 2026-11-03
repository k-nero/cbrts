import type { FC } from 'react';

import type { StageRow } from './tracking';

import { cx, Deadline, Icon, Panel, STAGES } from '@/components/ui';

/** The stage a row stands for, as its number in the seven ("Trip" is 6). */
const numberOf = (title: string) => {
  const stage = STAGES.find((s) => title === s);
  return stage ? STAGES.indexOf(stage) + 1 : null;
};

/**
 * Where it stands (Figma "Tracking · In transit", "Delivered"): the stages already done folded into one row,
 * the current one ringed in the accent with when it ends, and what comes after.
 */
export const TripStages: FC<{ rows: StageRow[] }> = ({ rows }) => (
  <Panel title="Where it stands" flush>
    <ol className="m-0 list-none p-0">
      {rows.map((row, i) => (
        <li
          key={row.title}
          aria-current={row.state === 'current' ? 'step' : undefined}
          className={cx('flex items-start gap-4 px-6 py-4', i > 0 && 'border-t border-line')}
        >
          <span
            aria-hidden
            className={cx(
              'type-caption flex size-7 shrink-0 items-center justify-center rounded-full border',
              row.state === 'done' && 'border-ok-line bg-ok-soft text-ok',
              row.state === 'current' && 'border-info text-info',
              row.state === 'upcoming' && 'border-line-strong text-ink-3',
            )}
          >
            {row.state === 'done' ? <Icon name="check" size={14} /> : numberOf(row.title)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="type-label-m text-ink">{row.title}</span>
            <span className="type-body-s text-ink-2">{row.body}</span>
          </div>
          {row.deadline && (
            <Deadline
              left={row.deadline.left}
              date={row.deadline.date}
              tone={row.deadline.tone ?? 'neutral'}
            />
          )}
        </li>
      ))}
    </ol>
  </Panel>
);
