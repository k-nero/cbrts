import { type FC, Fragment } from 'react';

import type { TripStanding } from './journey';

import { Button, Chip, cx, Icon } from '@/components/ui';
import type { TripPart } from '@/interfaces';
import { formatDayTime } from '@/lib/utils';

const CONNECTION_FG = { ok: 'text-ink-3', warn: 'text-warn', bad: 'text-bad' } as const;

/**
 * The job's trips, in journey order, inside the Trip tab (US-F3-16, US-F3-21): the trip chosen here is the one
 * planned beside it. Each says where it stands as a chip in tone plus word (its next open step, Locked, Ready, On the
 * road) with who holds it, its cities in full and when it leaves; the chosen one is the Nav item's active pill (Muted
 * Navy, Gold Ink label). Between two trips, where one hands the horses on, the time the next leaves after it. The
 * coordinator builds the journey here: Add trip at the foot, from the city it has reached, and take the last trip off
 * before it departs.
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
      <ol className="m-0 flex list-none flex-col p-0">
        {parts.map((part, index) => {
          const standing = standings[index];
          const onward = standing?.onward ?? null;
          return (
            <Fragment key={part.tripId}>
              <li>
                <button
                  type="button"
                  aria-current={part.current ? 'page' : undefined}
                  onClick={() => onShow(part.tripId)}
                  className={cx(
                    'focus-ring flex w-full cursor-pointer flex-col gap-1.5 rounded-md border-0 px-3 py-3 text-left transition-colors',
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
                      className={cx('type-label-s', part.current ? 'text-gold-ink' : 'text-ink')}
                    >
                      {index + 1} · {part.mode === 'AIR' ? 'Flight' : 'Road'}
                    </span>
                    <span className="type-caption ml-auto text-ink-3">{part.tripCode}</span>
                  </span>
                  {/* Cities in full: two lines rather than cut short. */}
                  <span className="type-data text-ink-2 [overflow-wrap:anywhere]">
                    {part.startCity && part.endCity
                      ? `${part.startCity} → ${part.endCity}`
                      : (part.corridorCode ?? '—')}
                  </span>
                  <span className="type-caption text-ink-3">
                    {part.plannedDepartureAt
                      ? `Leaves ${formatDayTime(part.plannedDepartureAt)}`
                      : 'Not planned'}
                  </span>
                  {standing && (
                    <span className="flex flex-col items-start gap-1 pt-0.5">
                      <Chip tone={standing.tone}>{standing.word}</Chip>
                      <span className="type-caption text-ink-3">{standing.line}</span>
                    </span>
                  )}
                </button>
              </li>
              {index < parts.length - 1 && (
                <li
                  aria-label={
                    part.handsOn
                      ? `Connection to ${parts[index + 1].tripCode}`
                      : `Then ${parts[index + 1].tripCode}`
                  }
                  className="ml-[18px] flex min-h-3 items-center border-l-2 border-line py-1.5 pl-3"
                >
                  {part.handsOn && (
                    <span
                      className={cx(
                        'type-caption flex items-center gap-1.5',
                        onward ? CONNECTION_FG[onward.tone] : 'text-ink-3',
                      )}
                    >
                      {onward && onward.tone !== 'ok' && <Icon name="alert" size={12} />}
                      {onward
                        ? onward.minutes < 0
                          ? `Connection ${onward.gap}`
                          : `${onward.gap} to connect`
                        : 'Connection not planned'}
                    </span>
                  )}
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
