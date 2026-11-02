import type { FC, ReactNode } from 'react';

import { type TripStanding, tightest } from './journey';

import { cx } from '@/components/ui';
import { TONE_FG } from '@/components/ui/tone';
import type { TripPart } from '@/interfaces';
import { formatDayTime } from '@/lib/utils';

/**
 * The journey in one strip (Trip tab, a job of two or more trips): when it leaves and arrives, how many trips wait on
 * the viewer, how many are locked, and the tightest connection. It says where the journey stands and picks nothing;
 * the rail chooses the trip, and the gold stays with that trip's Ready to depart.
 */
export const JourneySummary: FC<{ parts: TripPart[]; standings: TripStanding[] }> = ({
  parts,
  standings,
}) => {
  if (parts.length < 2) return null;
  const first = parts[0];
  const last = parts.at(-1);
  const yours = standings.filter((s) => s.yours).length;
  const locked = standings.filter((s) => s.word === 'Locked').length;
  const tight = tightest(standings);
  const at = tight ? standings.find((s) => s.onward === tight)?.part.endCity : null;

  const cells: [string, ReactNode, string?][] = [
    ['Trips', parts.length],
    ['Leaves', first.plannedDepartureAt ? formatDayTime(first.plannedDepartureAt) : 'Not planned'],
    ['Arrives', last?.plannedArrivalAt ? formatDayTime(last.plannedArrivalAt) : 'Not planned'],
    [
      'Wait on you',
      yours === 0 ? 'None' : `${yours} ${yours === 1 ? 'trip' : 'trips'}`,
      yours ? TONE_FG.warn : undefined,
    ],
    [
      'Locked',
      locked === 0 ? 'None' : `${locked} ${locked === 1 ? 'trip' : 'trips'}`,
      locked ? TONE_FG.bad : undefined,
    ],
    [
      'Tightest connection',
      tight ? `${tight.gap}${at ? ` in ${at}` : ''}` : 'Not planned',
      tight && tight.tone !== 'ok' ? TONE_FG[tight.tone] : undefined,
    ],
  ];

  return (
    <section
      aria-label="Journey"
      className="flex flex-wrap gap-x-10 gap-y-4 rounded-lg border border-line bg-card px-6 py-[18px]"
    >
      {cells.map(([label, value, tone]) => (
        <span key={label} className="flex flex-col gap-1">
          <span className="type-body-s text-ink-3">{label}</span>
          <span className={cx('type-label-m', tone ?? 'text-ink')}>{value}</span>
        </span>
      ))}
    </section>
  );
};
