import { describe, expect, test } from 'bun:test';

import {
  bordersSummary,
  EMPTY_WIZARD,
  endpointLabel,
  firstOpenStep,
  fromRequest,
  groomsFor,
  holdsStep,
  liveBlockers,
  passRows,
  pickableHorses,
  requestStatusChip,
  reviewRows,
  routeSentence,
  routeStops,
  serviceLine,
  stepOfBlocker,
  toDraftInput,
  windowLength,
} from './request';

import {
  type Blocker,
  type Endpoint,
  type Horse,
  type RequestHorse,
  RequestStatusEnum,
  type Route,
  type TransportRequest,
} from '@/interfaces';

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

const route = (over: Partial<Route>): Route => ({
  corridorId: 'c1',
  code: 'RD HCM → BKK',
  mode: 'ROAD',
  fromCity: 'Ho Chi Minh City',
  toCity: 'Bangkok',
  distanceKm: 960,
  crossings: [
    { name: 'Mộc Bài – Bavet', fromCountry: 'VN', toCountry: 'KH' },
    { name: 'Poipet – Aranyaprathet', fromCountry: 'KH', toCountry: 'TH' },
  ],
  countries: ['VN', 'KH', 'TH'],
  crossBorder: true,
  leadTimeDays: 21,
  earliestDeparture: '2026-11-07',
  ...over,
});
const hcmBkk = route({});
const hcmPnh = route({
  toCity: 'Phnom Penh',
  distanceKm: 230,
  crossings: [{ name: 'Mộc Bài – Bavet', fromCountry: 'VN', toCountry: 'KH' }],
});
const hcmHan = route({
  toCity: 'Hanoi',
  distanceKm: 1700,
  crossings: [],
  countries: ['VN'],
  crossBorder: false,
  leadTimeDays: 3,
});
const sgnHkg = route({ mode: 'AIR', toCity: 'Hong Kong', distanceKm: 1500, crossings: [] });

const onRequest = (over: Partial<RequestHorse>): RequestHorse => ({
  horseId: 'h1',
  name: 'Nightfall',
  sex: 'MARE',
  sizeClassCode: 'M',
  requiredStall: 'CLIMATE',
  declaredValue: 85000,
  withFoal: false,
  archived: false,
  missing: [],
  ...over,
});
const nightfall = onRequest({ withFoal: true });
const shadowfax = onRequest({
  horseId: 'h2',
  name: 'Shadowfax',
  sex: 'GELDING',
  requiredStall: 'STANDARD',
  declaredValue: 240000,
});

describe('route words', () => {
  test('route sentence', () => {
    expect(routeSentence(hcmBkk)).toBe(
      'About 960 km by road with 2 border crossings, worked out from your route.',
    );
    expect(routeSentence(hcmPnh)).toBe(
      'About 230 km by road with 1 border crossing, worked out from your route.',
    );
    expect(routeSentence(hcmHan)).toBe(
      'About 1,700 km by road within Vietnam, worked out from your route.',
    );
    expect(routeSentence(sgnHkg)).toBe('About 1,500 km by air, worked out from your route.');
  });

  test('strip stops: pickup, each border, destination with its distance', () => {
    expect(routeStops(hcmBkk).map((s) => [s.name, s.kind, s.state])).toEqual([
      ['Ho Chi Minh City', 'Pickup', 'upcoming'],
      ['Mộc Bài – Bavet', 'Border 1', 'upcoming'],
      ['Poipet – Aranyaprathet', 'Border 2', 'upcoming'],
      ['Bangkok', '~960 km', 'upcoming'],
    ]);
  });

  test('borders summary', () => {
    expect(bordersSummary(hcmBkk)).toBe('2 · Mộc Bài, Poipet');
    expect(bordersSummary(hcmHan)).toBe('None · domestic');
  });
});

describe('the draft pass', () => {
  test('before anything is set, each row says its step', () => {
    expect(passRows(EMPTY_WIZARD, undefined, null, false)).toEqual([
      { label: 'Departs', value: null, step: 2 },
      { label: 'Arrival', value: null, step: 2 },
      { label: 'Borders', value: null, step: 2 },
      { label: 'Service', value: null, step: 3 },
    ]);
  });

  test('a too-soon saved date is bad while the date is unchanged', () => {
    const saved = draft({
      departureDate: '2026-10-05',
      blockers: [blocker('LEAD_TIME_TOO_SHORT', 'departureDate')],
    });
    const values = { ...EMPTY_WIZARD, departureDate: '2026-10-05' };
    expect(passRows(values, saved, hcmBkk, false)[0]).toEqual({
      label: 'Departs',
      value: '5 Oct · too soon',
      mono: true,
      tone: 'bad',
    });
    expect(passRows({ ...values, departureDate: '2026-11-30' }, saved, hcmBkk, false)[0]).toEqual({
      label: 'Departs',
      value: '30 Nov 2026',
      mono: true,
    });
  });

  test('departs with flex, any time, borders and the service', () => {
    const values = {
      ...EMPTY_WIZARD,
      departureDate: '2026-10-30',
      flexible: true,
      mode: 'ROAD' as const,
      trailer: 'SHARED' as const,
    };
    expect(passRows(values, undefined, hcmBkk, false).map((r) => r.value)).toEqual([
      '30 Oct 2026 · ±3 d',
      'Any time on the day',
      '2 · Mộc Bài, Poipet',
      'Road · shared load',
    ]);
  });

  test('a window, air, and a route we do not run', () => {
    const win = passRows(
      {
        ...EMPTY_WIZARD,
        departureDate: '2026-10-30',
        arrivalMode: 'WINDOW',
        arriveOn: '2026-10-31',
        windowFrom: time('08:00'),
        windowUntil: time('12:00'),
      },
      undefined,
      hcmBkk,
      false,
    );
    expect(win[1]).toEqual({ label: 'Arrival', value: '31 Oct · 08:00–12:00', mono: true });
    expect(win[3].value).toBe('Road · private trailer');
    const air = passRows({ ...EMPTY_WIZARD, mode: 'AIR', airClass: 'BUSINESS' }, undefined, sgnHkg, false);
    expect(air[3].value).toBe('Air · business class');
    expect(passRows(EMPTY_WIZARD, undefined, null, true)[2]).toEqual({
      label: 'Borders',
      value: 'Not run yet',
      tone: 'warn',
    });
  });

  test('service line', () => {
    const values = {
      ...EMPTY_WIZARD,
      mode: 'ROAD' as const,
      trailer: 'SHARED' as const,
      insurance: 'OWN_POLICY' as const,
    };
    expect(serviceLine(values, [nightfall, shadowfax])).toBe(
      'Road · shared load · 1 climate stall · your own insurance',
    );
  });
});

describe('review', () => {
  const full = draft({
    horses: [nightfall, shadowfax],
    origin: place('p1', 'Phú Thọ training centre', 'Ho Chi Minh City', 'VN'),
    destination: place('p2', 'Chao Phraya Racing Stables', 'Bangkok', 'TH'),
    departureDate: '2026-10-30',
    dateFlexDays: 3,
    specialInstructions: 'Quiet loading. Vet check on arrival.',
    mode: 'ROAD',
    trailer: 'SHARED',
    insurance: 'OWN_POLICY',
    route: hcmBkk,
  });

  test('rows follow the wizard order, each with its step', () => {
    expect(reviewRows(full).map((r) => [r.label, r.step])).toEqual([
      ['Horses', 'horses'],
      ['Pickup', 'route'],
      ['Route', 'route'],
      ['Departure', 'route'],
      ['Arrival', 'route'],
      ['Instructions', 'route'],
      ['Service', 'service'],
      ['Insurance', 'service'],
    ]);
  });

  test('row values', () => {
    const v = Object.fromEntries(reviewRows(full).map((r) => [r.label, r.value]));
    expect(v.Horses).toBe('Nightfall (with foal), Shadowfax');
    expect(v.Pickup).toBe('Phú Thọ training centre, Ho Chi Minh City');
    expect(v.Route).toBe(
      'Chao Phraya Racing Stables, Bangkok · via Mộc Bài – Bavet and Poipet – Aranyaprathet',
    );
    expect(v.Departure).toBe('30 Oct 2026 · ±3 days');
    expect(v.Arrival).toBe('Any time on the day');
    expect(v.Service).toBe('Road · shared load');
    const direct = reviewRows({ ...full, route: hcmHan }).find((r) => r.label === 'Route');
    expect(direct?.value).toBe('Chao Phraya Racing Stables, Bangkok · direct');
  });
});

describe('small rules', () => {
  test('grooms: one per three horses, rounded up', () => {
    expect([1, 3, 4, 7].map(groomsFor)).toEqual([1, 1, 2, 3]);
  });

  test('every status has a word and a tone', () => {
    for (const s of Object.values(RequestStatusEnum))
      expect(requestStatusChip(s).label.length).toBeGreaterThan(0);
    expect(requestStatusChip('DRAFT')).toEqual({ label: 'Draft', tone: 'neutral' });
    expect(requestStatusChip('SUBMITTED')).toEqual({ label: 'Submitted', tone: 'info' });
    expect(requestStatusChip('INFO_REQUIRED')).toEqual({ label: 'Info required', tone: 'warn' });
  });

  test('a horse archived after it was added still shows, after the active ones', () => {
    const active = [{ id: 'h1', name: 'Nightfall' } as Horse];
    const list = pickableHorses(active, [
      onRequest({ horseId: 'h9', name: 'Silver Bell', archived: true }),
      nightfall,
    ]);
    expect(list.map((x) => x.id)).toEqual(['h1', 'h9']);
    expect(list[0]).toMatchObject({ horse: { id: 'h1' }, draft: { horseId: 'h1' } });
    expect(list[1]).toMatchObject({ horse: null, draft: { archived: true } });
  });
});
