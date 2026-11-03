import { describe, expect, test } from 'bun:test';

import { departureReadiness, nextStep } from './readiness';

import type { JobDetail, TripPart } from '@/interfaces';

const stall = (horse: boolean) => ({ horse: horse ? { id: 'h' } : null });
const trailer = (placed: number) => ({
  tripVehicleId: 'tv1',
  vehicleCode: 'TX-447',
  stalls: Array.from({ length: 6 }, (_, i) => stall(i < placed)),
});

const ready = {
  horses: [{}, {}, {}, {}],
  loadPlan: {
    status: 'CONFIRMED',
    confirmedByName: 'Khôi',
    unassignedHorses: [],
    vehicles: [trailer(4)],
  },
  crew: [
    { crewRole: 'DRIVER', tripVehicleId: 'tv1' },
    { crewRole: 'GROOM', tripVehicleId: 'tv1' },
    { crewRole: 'GROOM', tripVehicleId: 'tv1' },
  ],
  clearanceGateState: 'Clear',
  clearanceGateSummary: '',
  tripSignedOffAt: '2026-11-01T03:00:00Z',
  tripSignedOffBy: 'Vũ Hải Yến',
} as unknown as JobDetail;

const part = {
  tripCode: 'TRP-2026-007',
  startCity: 'Hong Kong',
  status: 'NOT_STARTED',
} as TripPart;

describe('departureReadiness', () => {
  test('every step done: the trip can leave', () => {
    const steps = departureReadiness(ready, part, null, true);
    expect(steps.map((s) => s.state)).toEqual(['done', 'done', 'done', 'done', 'done']);
    expect(nextStep(steps)).toBeNull();
  });

  test('an unconfirmed load plan is the next step; the steps after it wait', () => {
    const job = {
      ...ready,
      loadPlan: { ...ready.loadPlan, status: 'DRAFT' },
      tripSignedOffAt: null,
    };
    const steps = departureReadiness(job as JobDetail, part, null, true);
    expect(nextStep(steps)?.key).toBe('load');
    expect(steps.find((s) => s.key === 'sign-off')?.state).toBe('waiting');
  });

  test('a trailer without a driver or enough grooms names what it needs', () => {
    const job = { ...ready, crew: [{ crewRole: 'GROOM', tripVehicleId: 'tv1' }] };
    const crew = departureReadiness(job as JobDetail, part, null, true).find(
      (s) => s.key === 'crew',
    );
    expect(crew?.state).toBe('todo');
    expect(crew?.detail).toBe('TX-447 needs a driver and 1 more groom.');
  });

  test('a locked gate stays Locked, not Waiting, behind an earlier step', () => {
    const job = { ...ready, clearanceGateState: 'Locked', tripSignedOffAt: null };
    const steps = departureReadiness(job as JobDetail, part, null, false);
    expect(nextStep(steps)?.key).toBe('route');
    expect(steps.find((s) => s.key === 'clearance')?.state).toBe('locked');
  });

  test('a later trip waits for the trip before to hand the horses on', () => {
    const previous = { tripCode: 'TRP-2026-006', status: 'DEPARTED' } as TripPart;
    const steps = departureReadiness(ready, part, previous, true);
    expect(nextStep(steps)?.key).toBe('handed-on');
    expect(nextStep(steps)?.state).toBe('waiting');
    const delivered = { ...previous, status: 'DELIVERED' } as TripPart;
    expect(nextStep(departureReadiness(ready, part, delivered, true))).toBeNull();
  });
});
