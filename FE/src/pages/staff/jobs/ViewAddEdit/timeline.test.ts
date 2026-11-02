import { describe, expect, test } from 'bun:test';

import { connection, legLine, span, stopTimes } from './timeline';

import type { TripPart } from '@/interfaces';

describe('stopTimes', () => {
  test('the day shows on the first stop and when it changes, in Indochina Time', () => {
    expect(
      stopTimes([
        { plannedAt: '2026-11-29T17:00:00Z' },
        { plannedAt: '2026-11-30T02:00:00Z' },
        { plannedAt: '2026-11-30T17:00:00Z' },
        { plannedAt: null },
      ]),
    ).toEqual(['30 Nov, 00:00', '09:00', '1 Dec, 00:00', '—']);
  });
});

describe('span', () => {
  test('reads minutes as hours and minutes', () => {
    expect(span(0)).toBe('0 min');
    expect(span(45)).toBe('45 min');
    expect(span(240)).toBe('4 h');
    expect(span(270)).toBe('4 h 30 min');
  });
});

describe('legLine', () => {
  test('a drive with no time is flagged', () => {
    expect(legLine({ mode: 'ROAD', distanceKm: 960, plannedMin: null })).toEqual({
      text: 'Road · 960 km · time not set',
      missingTime: true,
    });
    expect(legLine({ mode: 'AIR', distanceKm: null, plannedMin: 220 }).missingTime).toBe(false);
  });
});

describe('connection', () => {
  const from = { handsOn: true, plannedArrivalAt: '2026-11-30T17:00:00Z' } as TripPart;
  const to = (at: string) => ({ plannedDepartureAt: at }) as TripPart;

  test('no time between the hand-on and the next departure is a warning', () => {
    expect(connection(from, to('2026-11-30T17:00:00Z'))).toEqual({
      minutes: 0,
      tone: 'warn',
      gap: '0 min',
    });
  });

  test('an overlap is bad, and enough time is fine', () => {
    expect(connection(from, to('2026-11-30T16:30:00Z'))?.gap).toBe('overlaps by 30 min');
    expect(connection(from, to('2026-11-30T16:30:00Z'))?.tone).toBe('bad');
    expect(connection(from, to('2026-11-30T19:00:00Z'))?.tone).toBe('ok');
  });

  test('no connection without a hand-on or a planned time', () => {
    expect(connection({ ...from, handsOn: false }, to('2026-11-30T19:00:00Z'))).toBeNull();
    expect(connection(from, { plannedDepartureAt: null } as TripPart)).toBeNull();
  });
});
