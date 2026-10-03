import type { FC, ReactNode } from 'react';

import { Icon } from './Icon';
import { cx } from './tone';

export type RouteStopState = 'done' | 'current' | 'upcoming';

export type RouteStripStop = {
  name: ReactNode;
  /** "Pickup", "Border", "Welfare stop", "Delivery". */
  kind: ReactNode;
  /** "06:05 · departed", "exp. 09:30". */
  time: ReactNode;
  state: RouteStopState;
};

type Props = {
  stops: RouteStripStop[];
  /** The clearance gate as the route's first marker. */
  gate?: 'locked' | 'clear';
  className?: string;
};

/* A leg turns green only between confirmed checkpoints: positions come from recorded checkpoints, never a guess. */
const Leg: FC<{ confirmed: boolean }> = ({ confirmed }) => (
  <span aria-hidden className="flex-1 pt-[9px]">
    <span className={cx('block h-0.5 w-full', confirmed ? 'bg-ok' : 'bg-line-strong')} />
  </span>
);

const Marker: FC<{ state: RouteStopState }> = ({ state }) => (
  <span className="grid size-5 place-items-center">
    <span
      className={cx(
        'block rounded-full',
        state === 'done' && 'size-3.5 bg-ok',
        state === 'current' && 'size-5 border-2 border-info bg-info-soft',
        state === 'upcoming' && 'size-3.5 border-2 border-line-strong bg-canvas',
      )}
    />
  </span>
);

/**
 * The schematic route (DESIGN.md, Stage Row and Route Stop): circular stops joined by 2 px legs,
 * the clearance gate as a lock marker. No map tiles, no moving dot, no time finer than a checkpoint.
 */
export const RouteStrip: FC<Props> = ({ stops, gate, className }) => (
  <ol className={cx('m-0 flex list-none items-start p-0', className)}>
    {gate && (
      <>
        <li className="flex w-24 shrink-0 flex-col items-center gap-1.5 text-center">
          <span
            className={cx(
              'grid size-5 place-items-center rounded-full',
              gate === 'locked' ? 'bg-bad-soft text-bad' : 'bg-ok-soft text-ok',
            )}
          >
            <Icon name={gate === 'locked' ? 'lock' : 'unlock'} size={12} />
          </span>
          <span className="type-label-s text-ink">Clearance</span>
          <span className={cx('type-mono-label', gate === 'locked' ? 'text-bad' : 'text-ok')}>
            {gate === 'locked' ? 'Locked' : 'Clear'}
          </span>
        </li>
        <Leg confirmed={gate === 'clear'} />
      </>
    )}
    {stops.map((s, i) => {
      const next = stops[i + 1];
      return (
        <li key={i} className="contents">
          <span
            className="flex w-[132px] shrink-0 flex-col items-center gap-1.5 text-center"
            aria-current={s.state === 'current' ? 'step' : undefined}
          >
            <Marker state={s.state} />
            <span
              className={cx('type-label-s', s.state === 'upcoming' ? 'text-ink-2' : 'text-ink')}
            >
              {s.name}
            </span>
            <span className="type-mono-label text-ink-3">{s.kind}</span>
            <span
              className={cx('type-caption', s.state === 'current' ? 'text-info' : 'text-ink-3')}
            >
              {s.time}
            </span>
          </span>
          {next && (
            <Leg
              confirmed={s.state === 'done' && (next.state === 'done' || next.state === 'current')}
            />
          )}
        </li>
      );
    })}
  </ol>
);
