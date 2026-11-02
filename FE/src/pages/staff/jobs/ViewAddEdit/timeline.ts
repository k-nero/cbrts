import type { RouteLeg, RouteStop, TripPart } from '@/interfaces';
import { formatDayTime, formatTime, ict } from '@/lib/utils';

/**
 * Each stop's time on the route timeline: the day as well on the first stop and whenever the day changes, so a
 * 24-hour leg never reads "00:00 → 00:00". A stop with no time yet is a dash.
 */
export function stopTimes(stops: Pick<RouteStop, 'plannedAt'>[]): string[] {
  let day: string | null = null;
  return stops.map((s) => {
    if (!s.plannedAt) return '—';
    const d = ict(s.plannedAt).format('YYYY-MM-DD');
    const changed = d !== day;
    day = d;
    return changed ? formatDayTime(s.plannedAt) : formatTime(s.plannedAt);
  });
}

/** "45 min", "4 h", "4 h 30 min". */
export function span(minutes: number) {
  const m = Math.abs(Math.round(minutes));
  const h = Math.floor(m / 60);
  return [h && `${h} h`, (m % 60 || !h) && `${m % 60} min`].filter(Boolean).join(' ');
}

/** The leg between two stops, in words: "Road · 240 km · 4 h 30 min". `missingTime` flags a drive with no time. */
export function legLine(leg: Pick<RouteLeg, 'mode' | 'distanceKm' | 'plannedMin'>) {
  const mode = leg.mode === 'AIR' ? 'Air' : 'Road';
  const distance = leg.distanceKm
    ? `${leg.distanceKm.toLocaleString('en-GB')} km`
    : 'distance not set';
  const time = leg.plannedMin ? span(leg.plannedMin) : 'time not set';
  return {
    text: `${mode} · ${distance} · ${time}`,
    // Without a driving time the welfare stops the drive needs can't be checked.
    missingTime: leg.mode !== 'AIR' && !leg.plannedMin,
  };
}

/**
 * The least time between one trip handing the horses on and the next trip leaving with them, to unload, check and
 * load them again. A placeholder until the rate catalog's planning settings carry it, like every figure in the demo.
 */
export const MIN_CONNECTION_MIN = 60;

export interface Connection {
  /** Minutes from the hand-on to the next trip's departure; negative when they overlap. */
  minutes: number;
  tone: 'ok' | 'warn' | 'bad';
  /** "0 min", or "overlaps by 30 min". */
  gap: string;
}

/**
 * The connection between a trip that hands the horses on and the next trip of the journey, read from their planned
 * arrival and departure; null when either time isn't planned yet.
 */
export function connection(from: TripPart, to: TripPart): Connection | null {
  if (!from.handsOn || !from.plannedArrivalAt || !to.plannedDepartureAt) return null;
  const minutes = ict(to.plannedDepartureAt).diff(ict(from.plannedArrivalAt), 'minute');
  return {
    minutes,
    tone: minutes < 0 ? 'bad' : minutes < MIN_CONNECTION_MIN ? 'warn' : 'ok',
    gap: minutes < 0 ? `overlaps by ${span(minutes)}` : span(minutes),
  };
}
