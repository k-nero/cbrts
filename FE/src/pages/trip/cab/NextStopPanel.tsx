import type { FC } from 'react';

import { durText, stopKindLabel } from './cabState';

import { Panel } from '@/components/ui';
import type { TripStop } from '@/interfaces';
import { formatDate, formatTime, ict } from '@/lib/utils';

/** The next stop, what happens there and when, so the escort can plan the leg. */
export const NextStopPanel: FC<{ stop: TripStop }> = ({ stop }) => {
  const now = new Date().toISOString();
  const minutes = stop.plannedAt ? ict(stop.plannedAt).diff(ict(now), 'minute') : null;
  // Beyond today the date says more than a count of hours.
  const later = stop.plannedAt && !ict(stop.plannedAt).isSame(ict(now), 'day');
  const sub = [
    stopKindLabel(stop.kind),
    stop.details,
    stop.plannedStayMin ? durText(stop.plannedStayMin) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Panel title="Next stop">
      <div className="flex flex-col gap-1.5">
        <h3 className="type-h3 m-0 text-ink">{stop.name}</h3>
        <p className="type-body-s m-0 text-ink-2">{sub}</p>
        {stop.plannedAt && (
          <p className="m-0 flex items-baseline gap-3">
            <span className="type-data-l text-ink">{formatTime(stop.plannedAt)}</span>
            {minutes !== null && (
              <span className={`type-label-m ${minutes < 0 ? 'text-warn' : 'text-info'}`}>
                {later
                  ? formatDate(stop.plannedAt!)
                  : minutes < 0
                    ? `${durText(minutes)} ago`
                    : `in ${durText(minutes)}`}
              </span>
            )}
          </p>
        )}
      </div>
    </Panel>
  );
};
