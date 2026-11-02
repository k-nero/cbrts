import type { FC, ReactNode } from 'react';
import { Flex, Tooltip } from 'antd';

import { Chip } from '@/components/ui';
import type { JobDetail, RoutePlan } from '@/interfaces';
import { formatTime, ict } from '@/lib/utils';

/**
 * A trip's summary strip (Figma "Fleet & route coordinator · Route plan"), first on a road trip's Load plan and Route
 * views and on a flight, above every callout: where it starts and ends, how far and how long, by road its border
 * crossing and welfare stops and on a flight the airline's flight, the arrival window, and its clearance gate as a
 * chip, with the gate's own sentence in the tooltip. It stands in for the gate panel, which a trip with a route leaves
 * out.
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
  const flight = (routePlan.legs ?? []).find((l) => l.mode === 'AIR')?.flight ?? null;
  // A flight's route keeps its distance on the leg and its time in the flight's schedule.
  const legKm = (routePlan.legs ?? []).reduce((sum, l) => sum + (l.distanceKm ?? 0), 0);
  const km = routePlan.distanceKm ?? (legKm || null);
  const minutes =
    routePlan.durationMin ??
    (flight?.scheduledDepartureAt && flight.scheduledArrivalAt
      ? ict(flight.scheduledArrivalAt).diff(ict(flight.scheduledDepartureAt), 'minute')
      : null);
  const byRoad: [string, ReactNode][] = [
    ['Border crossing', stops.find((s) => s.kind === 'BORDER')?.borderCrossingName || 'None'],
    ['Welfare stops', stops.filter((s) => s.kind === 'WELFARE').length],
  ];
  const byAir: [string, ReactNode][] = [
    ['Flight', flight ? `${flight.airline} ${flight.flightNo}` : 'Not set'],
  ];

  const facts: [string, ReactNode][] = [
    ['Origin', origin],
    ['Destination', destination],
    ['Distance', km ? `${km} km` : '—'],
    ['Duration', minutes ? `${+(minutes / 60).toFixed(1)} h` : '—'],
    ...(part?.mode === 'AIR' ? byAir : byRoad),
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
