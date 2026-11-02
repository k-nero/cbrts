import type { FC, ReactNode } from 'react';
import { Flex, Tooltip } from 'antd';

import { Chip } from '@/components/ui';
import type { JobDetail, RoutePlan } from '@/interfaces';
import { formatTime, ict } from '@/lib/utils';

/**
 * A road trip's summary strip (Figma "Fleet & route coordinator · Route plan"), first on both its Load plan and Route
 * views, above every callout: where it starts and ends, how far and how long, its border crossing and welfare stops,
 * the arrival window, and its clearance gate as a chip, with the gate's own sentence in the tooltip. It stands in for
 * the page header's gate, which a road trip with a route leaves out.
 */
export const RouteSummary: FC<{ job: JobDetail; routePlan: RoutePlan }> = ({ job, routePlan }) => {
  const part = job.parts.find((p) => p.current) ?? null;
  const stops = routePlan.stops ?? [];
  // One trip of a journey starts and ends where its own route does (US-F3-16).
  const journey = job.parts.some((p) => p.handsOn);
  const origin = journey ? (stops[0]?.placeName ?? job.originCity) : job.originCity;
  const destination = journey
    ? (stops.at(-1)?.placeName ?? job.destinationCity)
    : job.destinationCity;
  const window =
    job.windowStart && job.windowEnd
      ? `${ict(job.windowEnd).format('D MMM')}, ${formatTime(job.windowStart)}–${formatTime(job.windowEnd)}`
      : 'Any time';
  const clear = job.clearanceGateState === 'Clear';

  const facts: [string, ReactNode][] = [
    ['Origin', origin],
    ['Destination', destination],
    ['Distance', routePlan.distanceKm ? `${routePlan.distanceKm} km` : '—'],
    ['Duration', routePlan.durationMin ? `${+(routePlan.durationMin / 60).toFixed(1)} h` : '—'],
    ['Border crossing', stops.find((s) => s.kind === 'BORDER')?.borderCrossingName || 'None'],
    ['Welfare stops', stops.filter((s) => s.kind === 'WELFARE').length],
    ['Arrival window', part?.handsOn ? 'Hands on to the next trip' : window],
    [
      'Clearance',
      <Tooltip key="gate" title={job.clearanceGateSummary}>
        <span className="w-fit">
          <Chip tone={clear ? 'ok' : 'bad'}>{clear ? 'Clear to depart' : 'Departure locked'}</Chip>
        </span>
      </Tooltip>,
    ],
  ];

  return (
    <div className="flex flex-wrap gap-x-10 gap-y-4 rounded-lg border border-line bg-card px-6 py-[18px]">
      {facts.map(([label, value]) => (
        <Flex key={label} vertical gap={4}>
          <span className="type-body-s text-ink-3">{label}</span>
          {typeof value === 'object' ? (
            value
          ) : (
            <span className="type-label-m text-ink">{value}</span>
          )}
        </Flex>
      ))}
    </div>
  );
};
