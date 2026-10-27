import type { FC } from 'react';

import { Button, Icon, cx } from '@/components/ui';
import type { TripPart } from '@/interfaces';

const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not planned';

/**
 * The job's trips, in journey order, inside the Trip tab (US-F3-16, US-F3-21): the trip chosen
 * here is the one planned beside it. Each names its mode, corridor read in the trip's direction,
 * trip code, where it stands and when it leaves; the chosen one is the Nav item's active pill
 * (Muted Navy, Gold Ink label). The coordinator builds the journey here: Add trip at the foot,
 * from the city it has reached, and Take off on the last trip before it departs.
 */
export const JourneyRail: FC<{
  parts: TripPart[];
  onShow: (tripId: string) => void;
  /** The city the next trip starts from; null once the journey reaches the destination. */
  addFrom: string | null;
  /** Null when the viewer doesn't plan trips. */
  onAdd: (() => void) | null;
  onRemove: ((part: TripPart) => void) | null;
}> = ({ parts, onShow, addFrom, onAdd, onRemove }) => {
  const last = parts.at(-1);
  return (
    <nav aria-label="Journey" className="sticky top-4 flex w-60 shrink-0 flex-col gap-2">
      <span className="type-mono-label px-3 text-ink-3">
        Journey · {parts.length} {parts.length === 1 ? 'trip' : 'trips'}
      </span>
      <ol className="m-0 flex list-none flex-col gap-1 p-0">
        {parts.map((part, index) => (
          <li key={part.tripId}>
            <button
              type="button"
              aria-current={part.current ? 'page' : undefined}
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
                <span className={cx('type-label-s', part.current ? 'text-gold-ink' : 'text-ink')}>
                  {index + 1} · {part.mode === 'AIR' ? 'Flight' : 'Road'}
                </span>
                <span className="type-mono-label ml-auto text-ink-3">
                  {part.status.toLowerCase().replace('_', ' ')}
                </span>
              </span>
              <span className="type-data truncate text-ink-2">
                {part.startCity && part.endCity
                  ? `${part.startCity} → ${part.endCity}`
                  : (part.corridorCode ?? '—')}
              </span>
              <span className="type-caption text-ink-3">
                {part.tripCode} · {when(part.plannedDepartureAt)}
              </span>
            </button>
          </li>
        ))}
      </ol>
      {onRemove && last && last.status === 'NOT_STARTED' && (
        <Button variant="ghost" size="sm" onClick={() => onRemove(last)}>
          Take off {last.tripCode}
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
