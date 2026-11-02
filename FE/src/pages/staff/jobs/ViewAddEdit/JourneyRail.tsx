import { type FC, Fragment } from 'react';

import type { TripStanding } from './journey';

import { Button, Chip, cx, Icon } from '@/components/ui';
import type { TripPart } from '@/interfaces';
import { formatDayTime } from '@/lib/utils';

const CONNECTION_FG = { ok: 'text-ink-3', warn: 'text-warn', bad: 'text-bad' } as const;

/**
 * The job's trips, in journey order, inside the Trip tab (US-F3-16, US-F3-21): the trip chosen here is the one
 * planned beside it. Each is three short lines: its number and mode with where it stands (a chip: its next open step,
 * Locked, Ready, On the road), its cities in full, and when it leaves; its code and who holds the step are in the
 * tooltip. The chosen one is the Nav item's active pill (Muted Navy, Gold Ink label). A connection between two trips
 * shows only when it is too tight. The coordinator builds the journey here: Add trip at the foot, from the city it has
 * reached, and take the last trip off before it departs.
 */
export const JourneyRail: FC<{
  parts: TripPart[];
  /** Each trip's standing, in the same order; empty while a one-trip job needs none. */
  standings: TripStanding[];
  onShow: (tripId: string) => void;
  /** The city the next trip starts from; null once the journey reaches the destination. */
  addFrom: string | null;
  /** Null when the viewer doesn't plan trips. */
  onAdd: (() => void) | null;
  onRemove: ((part: TripPart) => void) | null;
}> = ({ parts, standings, onShow, addFrom, onAdd, onRemove }) => {
  const last = parts.at(-1);
  return (
    <nav aria-label="Journey" className="sticky top-4 flex w-60 shrink-0 flex-col gap-2">
      <span className="type-mono-label px-3 text-ink-3">
        Journey · {parts.length} {parts.length === 1 ? 'trip' : 'trips'}
      </span>
      <ol className="m-0 flex list-none flex-col gap-1 p-0">
        {parts.map((part, index) => {
          const standing = standings[index];
          const onward = standing?.onward ?? null;
          // Only a connection that needs attention is shown between two trips.
          const tight = part.handsOn && onward && onward.tone !== 'ok' ? onward : null;
          return (
            <Fragment key={part.tripId}>
              <li>
                <button
                  type="button"
                  aria-current={part.current ? 'page' : undefined}
                  title={[part.tripCode, standing?.line].filter(Boolean).join(' · ')}
                  onClick={() => onShow(part.tripId)}
                  className={cx(
                    'focus-ring flex w-full cursor-pointer flex-col gap-1 rounded-md border-0 px-3 py-2.5 text-left transition-colors',
                    part.current ? 'bg-muted' : 'bg-transparent hover:bg-muted',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon
                      name={part.mode === 'AIR' ? 'plane' : 'truck'}
                      size={14}
                      className={part.current ? 'text-gold-ink' : 'text-ink-3'}
                    />
                    <span
                      className={cx('type-label-s', part.current ? 'text-gold-ink' : 'text-ink-2')}
                    >
                      {index + 1} · {part.mode === 'AIR' ? 'Flight' : 'Road'}
                    </span>
                    {standing && (
                      <Chip tone={standing.tone} className="ml-auto">
                        {standing.word}
                      </Chip>
                    )}
                  </span>
                  {/* Cities in full: two lines rather than cut short. */}
                  <span className="type-label-m text-ink">
                    {part.startCity && part.endCity
                      ? `${part.startCity} → ${part.endCity}`
                      : (part.corridorCode ?? '—')}
                  </span>
                  <span className="type-caption text-ink-3">
                    {part.plannedDepartureAt
                      ? `Leaves ${formatDayTime(part.plannedDepartureAt)}`
                      : 'Not planned'}
                  </span>
                </button>
              </li>
              {tight && (
                <li
                  className={cx(
                    'type-caption flex items-center gap-1.5 px-3',
                    CONNECTION_FG[tight.tone],
                  )}
                >
                  <Icon name="alert" size={12} />
                  {tight.minutes < 0 ? `Connection ${tight.gap}` : `${tight.gap} to connect`}
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
      {onRemove && last && last.status === 'NOT_STARTED' && (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto! min-h-8 py-1.5 text-left whitespace-normal!"
          onClick={() => onRemove(last)}
        >
          Take {last.tripCode} off the journey
        </Button>
      )}
      {onAdd && addFrom && (
        <Button variant="secondary" size="sm" leadingIcon="plus" onClick={onAdd}>
          Add trip from {addFrom}
        </Button>
      )}
    </nav>
  );
};
