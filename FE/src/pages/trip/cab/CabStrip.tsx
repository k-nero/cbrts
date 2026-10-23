import { formatClock } from '../tripFormat';

import type { TripStop, TripView } from '@/interfaces';
import { TripRecordKindEnum, TripStatusEnum } from '@/interfaces';

type Props = {
  trip: TripView;
  selectedStopId?: string | null;
  onSelectStop?: (stop: TripStop) => void;
};

export function CabStrip({ trip, selectedStopId, onSelectStop }: Props) {
  // Determine state of each stop: 'Done' | 'Current' | 'Held' | 'Upcoming'
  const isTripHeld = trip.tripStatus === TripStatusEnum.HELD;

  // Find index of the first stop without latestOccurredAt or held stop
  const firstPendingIndex = trip.stops.findIndex((s) => !s.latestOccurredAt);
  const heldIndex = isTripHeld
    ? trip.stops.findIndex((s) => s.latestStatus === TripRecordKindEnum.HELD)
    : -1;
  const activeHeldIndex =
    heldIndex !== -1
      ? heldIndex
      : firstPendingIndex === -1
        ? trip.stops.length - 1
        : firstPendingIndex;

  const currentIndex = isTripHeld
    ? activeHeldIndex
    : firstPendingIndex === -1
      ? trip.stops.length - 1
      : Math.max(0, firstPendingIndex);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
      {trip.stops.map((stop, index) => {
        let state: 'Done' | 'Current' | 'Held' | 'Upcoming';
        let timeDisplay: string;
        let subNote: string;

        if (isTripHeld) {
          if (index < activeHeldIndex) {
            state = 'Done';
            timeDisplay = formatClock(stop.latestOccurredAt);
            subNote = stop.kind === 'BORDER' ? 'Cleared' : 'Departed';
          } else if (index === activeHeldIndex) {
            state = 'Held';
            timeDisplay = formatClock(stop.latestOccurredAt);
            subNote = 'Held since';
          } else {
            state = 'Upcoming';
            timeDisplay = '—';
            subNote = 'Waits on the decision';
          }
        } else {
          const isDone = Boolean(stop.latestOccurredAt) && index < currentIndex;
          const isCurrent = index === currentIndex;
          state = isDone ? 'Done' : isCurrent ? 'Current' : 'Upcoming';
          timeDisplay = stop.latestOccurredAt
            ? formatClock(stop.latestOccurredAt)
            : formatClock(stop.plannedAt);
          subNote = stop.latestNote
            ? stop.latestNote
            : isDone
              ? 'Departed'
              : isCurrent
                ? 'Arrived · recording now'
                : 'Planned';
        }

        const isHeld = state === 'Held';
        const isDone = state === 'Done';
        const isCurrent = state === 'Current';
        const isCardActive = selectedStopId ? selectedStopId === stop.id : isCurrent;

        const dotBg =
          state === 'Done'
            ? 'bg-ok'
            : state === 'Held'
              ? 'bg-bad'
              : state === 'Current'
                ? 'bg-info'
                : 'bg-line-strong';

        const borderClass = isHeld
          ? 'border-bad bg-bad-soft/30'
          : isCurrent || isCardActive
            ? 'border-info bg-info-soft/30 ring-1 ring-info'
            : 'border-line bg-card';

        return (
          <button
            key={stop.id}
            type="button"
            onClick={() => onSelectStop?.(stop)}
            className={`flex flex-col gap-1.5 rounded-xl border p-4 text-left transition-colors ${borderClass} cursor-pointer hover:border-info`}
          >
            <div className="flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${dotBg} shrink-0`} />
              <span className="type-label-m truncate text-ink">{stop.name}</span>
            </div>
            <span className="type-body-s text-ink-2 capitalize">
              {stop.kind.toLowerCase().replaceAll('_', ' ')}
            </span>
            <span
              className={`type-mono-data text-2xl font-bold ${isDone ? 'text-ink-2' : 'text-ink'}`}
            >
              {timeDisplay}
            </span>
            <span
              className={`type-body-s truncate ${
                isHeld ? 'text-bad' : isCurrent ? 'text-info font-medium' : 'text-ink-3'
              }`}
            >
              {subNote}
            </span>
          </button>
        );
      })}
    </div>
  );
}
