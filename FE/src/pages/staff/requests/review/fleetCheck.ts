import type { Tone } from '@/components/ui';
import type { FleetCheck, RequestReview } from '@/interfaces';
import { formatDate } from '@/lib/utils';

/** The fleet check's chip (US-F7-02): said twice, as a tone and a word. */
export const FLEET_CHIP: Record<FleetCheck['outcome'], { tone: Tone; label: string }> = {
  FREE: { tone: 'ok', label: 'Vehicle free' },
  WITHIN_FLEX: { tone: 'warn', label: 'Within flexible dates' },
  NONE: { tone: 'bad', label: 'No vehicle' },
  NO_VEHICLE: { tone: 'bad', label: 'No vehicle on route' },
  FLOWN: { tone: 'neutral', label: 'Flown' },
};

/** True when no vehicle can run the request on its date or within its flexible days. */
export const fleetShort = (fleet: FleetCheck | null | undefined): boolean =>
  fleet?.outcome === 'NONE' || fleet?.outcome === 'NO_VEHICLE';

/**
 * The reason a rejection starts with when no vehicle can run the request (US-F7-02): what can't be
 * done, and the earliest date when there is one. The manager edits it before sending.
 */
export const fleetRejectReason = (review: RequestReview): string => {
  const { fleet, request } = review;
  if (!fleet || !fleetShort(fleet)) return '';
  const route = `${request.origin?.city ?? 'the origin'} to ${request.destination?.city ?? 'the destination'}`;
  if (fleet.outcome === 'NO_VEHICLE') {
    return `We don't have a vehicle on the route from ${route} yet, so we can't take this move.`;
  }
  return fleet.earliest
    ? `We have no vehicle free for ${route} around ${formatDate(fleet.date)}. The earliest we can start is ${formatDate(fleet.earliest)}; send a new request for that date and we'll quote it.`
    : `We have no vehicle free for ${route} around ${formatDate(fleet.date)}, nor in the weeks after it.`;
};
