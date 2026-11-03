import { describe, expect, test } from 'bun:test';

import { journeyStandings, openingTrip, tightest } from './journey';

import type { JobDetail, TripPart } from '@/interfaces';

const road = (code: string, more: Partial<TripPart> = {}) =>
  ({
    tripId: code,
    tripCode: code,
    mode: 'ROAD',
    status: 'NOT_STARTED',
    handsOn: false,
    ...more,
  }) as TripPart;

const detail = (more: Record<string, unknown> = {}) =>
  ({
    horses: [{}],
    routePlan: { status: 'CONFIRMED', legs: [] },
    loadPlan: { status: 'CONFIRMED', unassignedHorses: [], vehicles: [] },
    crew: [{ crewRole: 'DRIVER', tripVehicleId: null, onFlight: false }],
    clearanceGateState: 'Clear',
    clearanceGateSummary: '',
    tripSignedOffAt: null,
    coordinator: 'Đỗ Minh Khôi',
    transportSpecialist: 'Nguyễn Thị Lan',
    ...more,
  }) as unknown as JobDetail;

const coordinator = { canPlan: true, canSignOff: false };

describe('journeyStandings', () => {
  test('names each trip’s next step and who holds it', () => {
    const parts = [road('TRP-1', { handsOn: true }), road('TRP-2', { mode: 'AIR' }), road('TRP-3')];
    const details = [
      detail({ crew: [] }),
      detail({ clearanceGateState: 'Locked', crew: [{ crewRole: 'GROOM', onFlight: true }] }),
      detail({ routePlan: null }),
    ];
    const s = journeyStandings(parts, details, coordinator);
    expect(s.map((t) => [t.tone, t.word, t.line, t.yours])).toEqual([
      ['warn', 'Crew', 'Waiting on crew · Đỗ Minh Khôi', true],
      ['warn', 'Flight', 'Waiting on flight · Đỗ Minh Khôi', true],
      ['warn', 'Route', 'Waiting on route · Đỗ Minh Khôi', true],
    ]);
  });

  test('a flight with its times set waits on the locked gate', () => {
    const flight = {
      mode: 'AIR',
      flight: {
        airline: 'Cathay Cargo',
        flightNo: 'CX 2071',
        scheduledDepartureAt: 'x',
        scheduledArrivalAt: 'y',
      },
    };
    const s = journeyStandings(
      [road('TRP-2', { mode: 'AIR' })],
      [
        detail({
          routePlan: { status: 'CONFIRMED', legs: [flight] },
          clearanceGateState: 'Locked',
          crew: [{ crewRole: 'GROOM', onFlight: true }],
        }),
      ],
      coordinator,
    );
    expect([s[0].tone, s[0].word, s[0].line]).toEqual([
      'bad',
      'Locked',
      'Waiting on clearance · Nguyễn Thị Lan',
    ]);
  });

  test('a trip under way says so, and a trip still loading waits', () => {
    const s = journeyStandings(
      [road('TRP-1', { status: 'DEPARTED' }), road('TRP-2')],
      [undefined, undefined],
      coordinator,
    );
    expect(s.map((t) => t.word)).toEqual(['On the road', '…']);
  });
});

describe('openingTrip and tightest', () => {
  test('the tab opens on the first trip that waits on the viewer', () => {
    const parts = [road('TRP-1'), road('TRP-2')];
    const s = journeyStandings(
      parts,
      [detail({ tripSignedOffAt: null }), detail({ crew: [] })],
      coordinator,
    );
    // TRP-1 waits on the manager's sign-off, TRP-2 on the coordinator's crew.
    expect(openingTrip(s)?.tripCode).toBe('TRP-2');
  });

  test('the tightest connection is the shortest planned one', () => {
    const parts = [
      road('TRP-1', { handsOn: true, plannedArrivalAt: '2026-11-30T17:00:00Z' }),
      road('TRP-2', {
        handsOn: true,
        plannedDepartureAt: '2026-11-30T17:00:00Z',
        plannedArrivalAt: '2026-12-01T03:00:00Z',
      }),
      road('TRP-3', { plannedDepartureAt: '2026-12-01T09:00:00Z' }),
    ];
    const s = journeyStandings(parts, [detail(), detail(), detail()], coordinator);
    expect(tightest(s)?.gap).toBe('0 min');
  });
});
