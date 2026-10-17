import { describe, expect, test } from 'bun:test';

import {
  ageWords,
  changedRows,
  checkTally,
  checkTone,
  departsWords,
  noteState,
  queueRoute,
  queueWords,
  reviewSummary,
} from './review';

import type { QueueRow, ReviewCheck, TransportRequest } from '@/interfaces';

const row = (over: Partial<QueueRow> = {}): QueueRow => ({
  id: 'r1',
  code: 'REQ-2026-0193',
  club: 'Saigon Turf Club',
  fromCity: 'Ho Chi Minh City',
  toCity: 'Bangkok',
  mode: 'ROAD',
  horseCount: 2,
  departureDate: '2026-10-30',
  dateFlexDays: 3,
  waitingSince: '2026-09-26T02:14:00Z',
  revisionNo: 1,
  ...over,
});

const check = (state: 'OK' | 'BAD'): ReviewCheck => ({
  key: 'ROUTE_SERVED',
  state,
  word: state === 'OK' ? 'Served' : 'Not served',
  evidence: '',
  sub: null,
});

const sent = (over: Partial<TransportRequest> = {}): Partial<TransportRequest> => ({
  code: 'REQ-2026-0193',
  horses: [],
  origin: null,
  destination: null,
  departureDate: '2026-10-30',
  dateFlexDays: 3,
  arrivalMode: 'ANY_TIME',
  windowStart: null,
  windowEnd: null,
  specialInstructions: null,
  mode: 'ROAD',
  trailer: 'SHARED',
  airClass: null,
  insurance: 'OWN_POLICY',
  vetEscort: false,
  route: null,
  ...over,
});

describe('the queue', () => {
  const now = new Date('2026-09-28T12:00:00Z');

  test('age in whole minutes, hours or days', () => {
    expect(ageWords('2026-09-28T11:20:00Z', now)).toBe('40 min');
    expect(ageWords('2026-09-28T02:10:00Z', now)).toBe('9 h');
    expect(ageWords('2026-09-27T06:00:00Z', now)).toBe('1 d');
    expect(ageWords('2026-09-16T12:00:00Z', now)).toBe('12 d');
  });

  test('the route and how it goes', () => {
    expect(queueRoute(row())).toEqual({ title: 'Ho Chi Minh City → Bangkok', by: 'by road' });
    expect(queueRoute(row({ mode: 'AIR', toCity: 'Hong Kong' })).by).toBe('by air');
  });

  test('departs with its flexibility', () => {
    expect(departsWords('2026-10-30', 3)).toBe('30 Oct ±3 d');
    expect(departsWords('2026-10-30', 0)).toBe('30 Oct');
  });

  test('the position in the queue', () => {
    expect(queueWords({ position: 3, total: 4, previousId: 'a', nextId: 'b' })).toBe('3 of 4');
  });
});

describe('the review page', () => {
  test('the check tally and tone', () => {
    expect(checkTally([check('OK'), check('OK')])).toBe('2 of 2 pass');
    expect(checkTally([check('OK'), check('BAD')])).toBe('1 of 2 pass');
    expect(checkTone('OK')).toBe('ok');
    expect(checkTone('BAD')).toBe('bad');
  });

  test('the header names the club, the horses, the service and the departure', () => {
    const r = {
      ...sent({ horses: [{ name: 'Nightfall' }, { name: 'Shadowfax' }] as TransportRequest['horses'] }),
      club: 'Saigon Turf Club',
    } as TransportRequest & { club: string };
    expect(reviewSummary(r)).toBe(
      'Saigon Turf Club · 2 horses · road, shared load · departs 30 Oct 2026 ±3 d',
    );
    const air = { ...r, mode: 'AIR', trailer: null, airClass: 'BUSINESS', dateFlexDays: 0 } as typeof r;
    expect(reviewSummary(air)).toBe(
      'Saigon Turf Club · 2 horses · air, business class · departs 30 Oct 2026',
    );
  });

  test('what changed between two versions', () => {
    expect(changedRows(sent(), sent({ departureDate: '2026-11-02' }))).toEqual(['Departure']);
    expect(changedRows(undefined, sent())).toEqual([]);
  });

  test('a version sent before this slice still compares', () => {
    const old = { code: 'REQ-2026-0195', horses: [], departureDate: '2026-10-30' } as Partial<TransportRequest>;
    expect(() => changedRows(old, sent())).not.toThrow();
    expect(changedRows(old, { ...old })).toEqual([]);
  });

  test('the note counts after trimming, up to 500', () => {
    expect(noteState('  ')).toEqual({ length: 0, ok: false, count: '0 / 500' });
    expect(noteState(` ${'x'.repeat(500)} `)).toEqual({ length: 500, ok: true, count: '500 / 500' });
    expect(noteState('x'.repeat(501))).toEqual({ length: 501, ok: false, count: '501 / 500' });
  });
});
