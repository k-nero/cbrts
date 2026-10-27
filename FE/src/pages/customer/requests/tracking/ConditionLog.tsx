import type { FC } from 'react';

import { conditionLog } from './tracking';
import { TripPhotos } from './TripPhotos';

import { cx, Panel } from '@/components/ui';
import type { TripView } from '@/interfaces';
import { formatTime } from '@/lib/utils';

/** The latest condition log (Figma "Tracking · In transit"): what the grooms wrote, newest first. */
export const ConditionLog: FC<{ trip: TripView; limit?: number }> = ({ trip, limit = 4 }) => {
  const entries = conditionLog(trip).slice(0, limit);
  return (
    <Panel title="Latest condition log" flush>
      {entries.length === 0 ? (
        <p className="type-body-s m-0 px-6 pb-5 text-ink-3">
          Nothing logged yet. The grooms log each horse at every welfare stop.
        </p>
      ) : (
        <ol className="m-0 list-none p-0">
          {entries.map((e, i) => (
            <li
              key={e.id}
              className={cx('flex flex-col gap-1.5 px-6 py-3.5', i > 0 && 'border-t border-line')}
            >
              <span className="flex items-baseline gap-2.5">
                <span className="type-data text-ink">{formatTime(e.at)}</span>
                {e.by && <span className="type-body-s text-ink-3">{e.by}</span>}
              </span>
              <span className="type-body-s text-ink-2">{e.text}</span>
              <TripPhotos photos={e.photos} />
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
};
