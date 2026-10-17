import { describe, expect, test } from 'bun:test';

import {
  EMPTY_WIZARD,
  endpointLabel,
  firstOpenStep,
  fromRequest,
  holdsStep,
  liveBlockers,
  stepOfBlocker,
  toDraftInput,
  windowLength,
} from './request';

import type { Blocker, Endpoint, TransportRequest } from '@/interfaces';

const place = (id: string, name: string, city: string, countryCode: string): Endpoint => ({
  placeId: id,
  name,
  kind: 'STABLE',
  city,
  countryCode,
  text: null,
});
const typed = (text: string): Endpoint => ({
  placeId: null,
  name: null,
  kind: null,
  city: null,
  countryCode: null,
  text,
});

const draft = (over: Partial<TransportRequest> = {}): TransportRequest => ({
  id: 'r1',
  code: null,
  status: 'DRAFT',
  createdAt: '2026-10-17T02:00:00Z',
  updatedAt: '2026-10-17T02:00:00Z',
  submittedAt: null,
  horses: [],
  origin: null,
  destination: null,
  departureDate: null,
  dateFlexDays: 0,
  arrivalMode: 'ANY_TIME',
  windowStart: null,
  windowEnd: null,
  specialInstructions: null,
  mode: null,
  trailer: null,
  airClass: null,
  insurance: null,
  vetEscort: false,
  route: null,
  leadTime: null,
  blockers: [],
  ...over,
});

const blocker = (code: string, field: string): Blocker => ({ code, field, message: '' });
const time = (value: string) => ({ value, label: value });

describe('toDraftInput', () => {
  test('a window sends road, a private trailer, fixed dates and +07:00 instants', () => {
    const input = toDraftInput({
      ...EMPTY_WIZARD,
      arrivalMode: 'WINDOW',
      arriveOn: '2026-10-31',
      windowFrom: time('08:00'),
      windowUntil: time('12:00'),
      flexible: true,
      mode: 'AIR',
      airClass: 'BUSINESS',
    });
    expect(input).toMatchObject({
      arrivalMode: 'WINDOW',
      mode: 'ROAD',
      trailer: 'PRIVATE',
      dateFlexDays: 0,
      windowStart: '2026-10-31T08:00:00+07:00',
      windowEnd: '2026-10-31T12:00:00+07:00',
      airClass: null,
    });
  });

  test('any time sends no window times and the tick as 3 or 0', () => {
    expect(
      toDraftInput({
        ...EMPTY_WIZARD,
        flexible: true,
        arriveOn: '2026-10-31',
        windowFrom: time('08:00'),
        windowUntil: time('12:00'),
      }),
    ).toMatchObject({ arrivalMode: 'ANY_TIME', dateFlexDays: 3, windowStart: null, windowEnd: null });
    expect(toDraftInput(EMPTY_WIZARD).dateFlexDays).toBe(0);
  });

  test('a place sends its id, typed text sends the text, never both', () => {
    const input = toDraftInput({
      ...EMPTY_WIZARD,
      origin: { value: 'p1', label: 'Chao Phraya Racing Stables, Bangkok' },
      destination: { value: 'Singapore', label: 'Singapore', __isNew__: true },
    });
    expect(input).toMatchObject({
      originPlaceId: 'p1',
      originText: null,
      destinationPlaceId: null,
      destinationText: 'Singapore',
    });
  });

  test('blank instructions and typed text become null', () => {
    const input = toDraftInput({
      ...EMPTY_WIZARD,
      specialInstructions: '   ',
      destination: { value: '  ', label: '  ', __isNew__: true },
    });
    expect(input.specialInstructions).toBeNull();
    expect(input.destinationText).toBeNull();
  });

  test('the horses go as picked, with their foal ticks', () => {
    const horses = [
      { horseId: 'h1', withFoal: true },
      { horseId: 'h2', withFoal: false },
    ];
    expect(toDraftInput({ ...EMPTY_WIZARD, horses }).horses).toEqual(horses);
  });
});

describe('fromRequest', () => {
  test('a saved window reads back as the same Vietnam day and times', () => {
    const v = fromRequest(
      draft({
        arrivalMode: 'WINDOW',
        windowStart: '2026-10-31T01:00:00Z',
        windowEnd: '2026-10-31T05:00:00Z',
      }),
    );
    expect([v.arrivalMode, v.arriveOn, v.windowFrom?.value, v.windowUntil?.value]).toEqual([
      'WINDOW',
      '2026-10-31',
      '08:00',
      '12:00',
    ]);
  });

  test('a typed city round-trips as text', () => {
    const r = draft({ destination: typed('Singapore') });
    expect(fromRequest(r).destination).toEqual({
      value: 'Singapore',
      label: 'Singapore',
      __isNew__: true,
    });
    expect(toDraftInput(fromRequest(r)).destinationText).toBe('Singapore');
  });

  test('a round trip keeps the values', () => {
    const r = draft({
      horses: [
        {
          horseId: 'h1',
          name: 'Nightfall',
          sex: 'MARE',
          sizeClassCode: 'M',
          requiredStall: 'CLIMATE',
          declaredValue: 85000,
          withFoal: true,
          archived: false,
          missing: [],
        },
      ],
      origin: place('p1', 'Phú Thọ training centre', 'Ho Chi Minh City', 'VN'),
      destination: place('p2', 'Chao Phraya Racing Stables', 'Bangkok', 'TH'),
      departureDate: '2026-11-30',
      dateFlexDays: 3,
      specialInstructions: 'Quiet loading.',
      mode: 'ROAD',
      trailer: 'SHARED',
      insurance: 'OWN_POLICY',
      vetEscort: true,
    });
    expect(toDraftInput(fromRequest(r))).toEqual({
      horses: [{ horseId: 'h1', withFoal: true }],
      originPlaceId: 'p1',
      originText: null,
      destinationPlaceId: 'p2',
      destinationText: null,
      departureDate: '2026-11-30',
      dateFlexDays: 3,
      arrivalMode: 'ANY_TIME',
      windowStart: null,
      windowEnd: null,
      specialInstructions: 'Quiet loading.',
      mode: 'ROAD',
      trailer: 'SHARED',
      airClass: null,
      insurance: 'OWN_POLICY',
      vetEscort: true,
    });
    expect(fromRequest(r).origin).toEqual({
      value: 'p1',
      label: 'Phú Thọ training centre, Ho Chi Minh City',
    });
  });
});

describe('steps and blockers', () => {
  test('every backend blocker field lands on its step', () => {
    expect(stepOfBlocker(blocker('NO_HORSES', 'horses'))).toBe('horses');
    for (const f of ['origin', 'destination', 'departureDate', 'windowStart'])
      expect(stepOfBlocker(blocker('X', f))).toBe('route');
    for (const f of ['mode', 'trailer', 'airClass', 'insurance'])
      expect(stepOfBlocker(blocker('X', f))).toBe('service');
  });

  test('an incomplete horse does not hold the step; others do', () => {
    expect(holdsStep(blocker('HORSE_INCOMPLETE', 'horses'))).toBe(false);
    expect(holdsStep(blocker('HORSE_ARCHIVED', 'horses'))).toBe(true);
    expect(holdsStep(blocker('LEAD_TIME_TOO_SHORT', 'departureDate'))).toBe(true);
  });

  test('resume opens the first step with a blocker, else review', () => {
    expect(
      firstOpenStep(
        draft({
          blockers: [blocker('MODE_MISSING', 'mode'), blocker('DEPARTURE_MISSING', 'departureDate')],
        }),
      ),
    ).toBe('route');
    expect(firstOpenStep(draft({ blockers: [blocker('HORSE_INCOMPLETE', 'horses')] }))).toBe(
      'horses',
    );
    expect(firstOpenStep(draft({ blockers: [] }))).toBe('review');
  });

  test('a saved blocker stops counting once a field of its step changed', () => {
    const saved = [
      blocker('LEAD_TIME_TOO_SHORT', 'departureDate'),
      blocker('MODE_MISSING', 'mode'),
    ];
    expect(liveBlockers(saved, ['destination']).map((b) => b.code)).toEqual(['MODE_MISSING']);
    expect(liveBlockers(saved, []).length).toBe(2);
  });
});

describe('labels', () => {
  test('window length', () => {
    expect(windowLength('08:00', '12:00')).toBe('A 4-hour window.');
    expect(windowLength('08:00', '11:30')).toBe('A 3½-hour window.');
  });

  test('endpoint label', () => {
    expect(
      endpointLabel(place('p', 'Phú Thọ training centre', 'Ho Chi Minh City', 'VN')),
    ).toBe('Phú Thọ training centre, Ho Chi Minh City');
    expect(endpointLabel(typed('Singapore'))).toBe('Singapore');
  });
});
