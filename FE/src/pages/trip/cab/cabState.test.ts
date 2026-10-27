import { describe, expect, it } from 'bun:test';

import { cabPosition, outcomes, recordStop, stopCell } from './cabState';

import type { TripRecord, TripStop, TripView } from '@/interfaces';

const stop = (id: string, kind: string, latest?: string): TripStop => ({
  id,
  sequence: 0,
  kind: kind as TripStop['kind'],
  jobCode: null,
  name: id,
  plannedAt: '2026-10-18T02:30:00Z',
  plannedStayMin: null,
  details: null,
  latestStatus: (latest ?? null) as TripStop['latestStatus'],
  latestOccurredAt: latest ? '2026-10-18T02:36:00Z' : null,
  latestNote: null,
  latestRecordedBy: null,
});

const AT = '2026-10-18T02:36:00Z';

/** A record at a stop, as the trip's records carry it. */
const record = (kind: string, routeStopId: string | null): TripRecord =>
  ({ kind, routeStopId, occurredAt: AT }) as unknown as TripRecord;

/** The trip, with a record for each stop's latest status. */
const trip = (status: string, stops: TripStop[], extra: TripRecord[] = []): TripView =>
  ({
    jobCode: 'CBRT-2026-041',
    tripCode: 'TRP-2026-001',
    tripStatus: status,
    clearanceReady: true,
    stops,
    horses: [],
    records: [
      ...stops.filter((s) => s.latestStatus).map((s) => record(s.latestStatus!, s.id)),
      ...extra,
    ],
    parts: [],
    handover: null,
  }) as unknown as TripView;

describe('cabPosition', () => {
  it('puts a trip that has not left at its pickup', () => {
    const p = cabPosition(trip('NOT_STARTED', [stop('a', 'PICKUP'), stop('b', 'DELIVERY')]));
    expect(p).toMatchObject({ states: ['current', 'upcoming'], at: 0, next: 1 });
  });

  it('is between stops once the last one is left', () => {
    const p = cabPosition(
      trip('DEPARTED', [
        stop('a', 'PICKUP', 'DEPARTED'),
        stop('b', 'BORDER'),
        stop('c', 'DELIVERY'),
      ]),
    );
    expect(p).toMatchObject({ states: ['done', 'upcoming', 'upcoming'], at: -1, next: 1 });
  });

  it('is not placed at a stop by a condition check or a note', () => {
    const t = trip(
      'HELD',
      [stop('a', 'PICKUP', 'DEPARTED'), stop('b', 'TRANSFER')],
      [record('CONDITION_CHECK', 'b'), record('NOTE', 'b')],
    );
    expect(cabPosition(t)).toMatchObject({ states: ['done', 'upcoming'], at: -1, next: 1 });
    expect(recordStop(t, cabPosition(t), 'CONDITION_CHECK')).toBeNull();
  });

  it('is at a stop it arrived at, held when the trip is', () => {
    const stops = [
      stop('a', 'PICKUP', 'DEPARTED'),
      stop('b', 'BORDER', 'HELD'),
      stop('c', 'DELIVERY'),
    ];
    expect(cabPosition(trip('HELD', stops)).states).toEqual(['done', 'held', 'upcoming']);
    expect(cabPosition(trip('HELD', stops)).at).toBe(1);
  });

  it('stays at the delivery until the handover', () => {
    const p = cabPosition(
      trip('DELIVERED', [stop('a', 'PICKUP', 'DEPARTED'), stop('b', 'DELIVERY', 'DELIVERED')]),
    );
    expect(p.at).toBe(1);
    expect(p.states).toEqual(['done', 'current']);
  });
});

describe('outcomes', () => {
  it('offers cleared, held and a note at a border', () => {
    const t = trip('DEPARTED', [
      stop('a', 'PICKUP', 'DEPARTED'),
      stop('b', 'BORDER', 'ARRIVED_AT_STOP'),
    ]);
    expect(outcomes(t, cabPosition(t)).map((o) => o.kind)).toEqual([
      'CLEARED_BORDER',
      'HELD',
      'NOTE',
    ]);
  });

  it('blocks the departure until clearance', () => {
    const t = { ...trip('NOT_STARTED', [stop('a', 'PICKUP')]), clearanceReady: false };
    const depart = outcomes(t, cabPosition(t)).find((o) => o.kind === 'DEPARTED');
    expect(depart?.blocked).toBeTruthy();
  });

  it('records an arrival at the next stop between stops', () => {
    const t = trip('DEPARTED', [stop('a', 'PICKUP', 'DEPARTED'), stop('b', 'WELFARE')]);
    const p = cabPosition(t);
    expect(outcomes(t, p)[0].kind).toBe('ARRIVED_AT_STOP');
    expect(recordStop(t, p, 'ARRIVED_AT_STOP')).toBe('b');
    expect(recordStop(t, p, 'NOTE')).toBeNull();
  });
});

describe('stopCell', () => {
  it('says how late an arrival was', () => {
    const mark = { kind: 'ARRIVED_AT_STOP' as const, at: AT };
    const cell = stopCell(stop('b', 'WELFARE'), mark, 'current', false);
    expect(cell.note).toBe('Arrived · 6 min late');
    expect(cell.time).toBe('09:36');
  });

  it('says nothing against a plan half a day away', () => {
    const far = { ...stop('a', 'PICKUP'), plannedAt: '2026-11-17T23:00:00Z' };
    expect(stopCell(far, { kind: 'LOADED', at: AT }, 'current', false).note).toBe('Loaded');
  });

  it('marks stops after a hold as waiting on the decision', () => {
    expect(stopCell(stop('c', 'DELIVERY'), null, 'upcoming', true)).toMatchObject({
      time: '—',
      note: 'Waits on the decision',
    });
  });
});
