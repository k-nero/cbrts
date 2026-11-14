import {
  departureReadiness,
  isPlannerStep,
  nextStep,
  type ReadinessStep,
  stepOwner,
} from './readiness';
import { type Connection, connection } from './timeline';

import type { Tone } from '@/components/ui/tone';
import type { JobDetail, TripPart } from '@/interfaces';

/** Where one trip of the journey stands, for the rail and the band: a chip in tone plus word, and a line. */
export interface TripStanding {
  part: TripPart;
  tone: Tone;
  word: string;
  /** "Waiting on crew · Đỗ Minh Khôi", "Every step is done", "Departed". */
  line: string;
  next: ReadinessStep | null;
  /** True when the next step is the viewer's to do. */
  yours: boolean;
  /** The connection to the next trip, when this one hands the horses on. */
  onward: Connection | null;
}

export interface Viewer {
  canPlan: boolean;
  canSignOff: boolean;
}

/**
 * Each trip's standing, read from its own page (`details`, in the same order as `parts`; undefined while loading).
 * A trip under way says so; one still to leave names its first open step and who holds it.
 */
export function journeyStandings(
  parts: TripPart[],
  details: (JobDetail | undefined)[],
  viewer: Viewer,
): TripStanding[] {
  return parts.map((part, i) => {
    const next = parts[i + 1];
    const onward = next ? connection(part, next) : null;
    const base = { part, onward, next: null, yours: false };
    if (part.status === 'DEPARTED')
      return { ...base, tone: 'info', word: 'On the road', line: 'Departed' };
    if (part.status === 'HELD')
      return { ...base, tone: 'bad', word: 'Held', line: 'Held on the road' };
    if (part.status === 'ARRIVED' || part.status === 'DELIVERED')
      return {
        ...base,
        tone: 'ok',
        word: part.handsOn ? 'Handed on' : 'Delivered',
        line: part.handsOn ? 'Horses handed on' : 'Horses delivered',
      };
    const detail = details[i];
    if (!detail) return { ...base, tone: 'neutral', word: '…', line: 'Checking…' };
    const previous = i > 0 && parts[i - 1].handsOn ? parts[i - 1] : null;
    const steps = departureReadiness(
      detail,
      part,
      previous,
      detail.routePlan?.status === 'CONFIRMED',
    );
    const step = nextStep(steps);
    if (!step) return { ...base, tone: 'ok', word: 'Ready', line: 'Every step is done' };
    // The hand-over step is named for its outcome; while it waits, say what the trip waits for.
    if (step.key === 'handed-on' && previous)
      return {
        ...base,
        next: step,
        tone: 'neutral',
        word: 'Awaiting horses',
        line: `Waits for ${previous.tripCode ?? 'the trip before'} to hand the horses on · ${stepOwner(detail, step)}`,
      };
    const yours =
      step.state === 'todo' &&
      ((isPlannerStep(step) && viewer.canPlan) || (step.key === 'sign-off' && viewer.canSignOff));
    return {
      ...base,
      next: step,
      yours,
      tone: step.state === 'locked' ? 'bad' : step.state === 'todo' ? 'warn' : 'neutral',
      word: step.state === 'locked' ? 'Locked' : step.label,
      line: `Waiting on ${step.label.toLowerCase()} · ${stepOwner(detail, step)}`,
    };
  });
}

/** The trip the Trip tab opens on: the first, in journey order, that waits on the viewer; else the first. */
export const openingTrip = (standings: TripStanding[]) =>
  (standings.find((s) => s.yours) ?? standings[0])?.part ?? null;

/** The tightest connection of the journey, or null when none is planned. */
export const tightest = (standings: TripStanding[]) =>
  standings
    .map((s) => s.onward)
    .filter((c): c is Connection => c !== null)
    .sort((a, b) => a.minutes - b.minutes)[0] ?? null;
