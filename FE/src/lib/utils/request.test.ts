import { describe, expect, test } from 'bun:test';

import {
  alsoByLine,
  editable,
  passChip,
  savedLine,
  submitLabel,
  versionLine,
  blockerFieldErrors,
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
  retiredRefusals,
  revealSelector,
  reviewRows,
  roadRuns,
  routePlanLine,
  routeSentence,
  routeStops,
  serviceLine,
  shownBlockers,
  stepOfBlocker,
  toDraftInput,
  windowLength,
  type WizardValues,
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
  infoRequiredNote: null,
  revisions: [],
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
    ).toMatchObject({
      arrivalMode: 'ANY_TIME',
      dateFlexDays: 3,
      windowStart: null,
      windowEnd: null,
    });
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
      city: 'Singapore',
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
      city: 'Ho Chi Minh City',
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
          blockers: [
            blocker('MODE_MISSING', 'mode'),
            blocker('DEPARTURE_MISSING', 'departureDate'),
          ],
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

describe('which saved blockers a step shows', () => {
  const saved = [
    blocker('DESTINATION_MISSING', 'destination'),
    blocker('LEAD_TIME_TOO_SHORT', 'departureDate'),
    blocker('MODE_MISSING', 'mode'),
  ];

  test('a missing value waits until its step was tried; a wrong one shows at once', () => {
    expect(shownBlockers(saved, []).map((b) => b.code)).toEqual(['LEAD_TIME_TOO_SHORT']);
    expect(shownBlockers(saved, ['route']).map((b) => b.code)).toEqual([
      'DESTINATION_MISSING',
      'LEAD_TIME_TOO_SHORT',
    ]);
  });
});

describe('where standing blockers and refusals are shown', () => {
  test('field errors: each on its form field, except what the step says elsewhere', () => {
    expect(
      blockerFieldErrors([
        { code: 'LEAD_TIME_TOO_SHORT', field: 'departureDate', message: 'Too soon.' },
        { code: 'PLACE_NOT_CHOSEN', field: 'origin', message: 'Choose a place.' },
        { code: 'WINDOW_BEFORE_DEPARTURE', field: 'windowStart', message: 'Before.' },
        { code: 'ROUTE_NOT_RUN', field: 'destination', message: 'Not run.' },
        { code: 'MODE_MISSING', field: 'mode', message: 'Choose road or air.' },
      ]),
    ).toEqual({ departureDate: 'Too soon.', origin: 'Choose a place.', arriveOn: 'Before.' });
  });

  test('a refusal for the whole step is brought into view at its callout', () => {
    expect(revealSelector(true)).toBe('[data-refusal]');
    expect(revealSelector(false)).toBe('.ant-form-item-has-error, [data-refusal]');
  });
});

describe('labels', () => {
  test('window length', () => {
    expect(windowLength('08:00', '12:00')).toBe('A 4-hour window.');
    expect(windowLength('08:00', '11:30')).toBe('A 3½-hour window.');
  });

  test('endpoint label', () => {
    expect(endpointLabel(place('p', 'Phú Thọ training centre', 'Ho Chi Minh City', 'VN'))).toBe(
      'Phú Thọ training centre, Ho Chi Minh City',
    );
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
    expect(bordersSummary(sgnHkg)).toBe('None · by air');
  });

  test('after approval: the road and stops, or the flight and its transfers', () => {
    expect(routePlanLine(hcmBkk)).toBe(
      'The fleet coordinator plans the exact road and stops after approval.',
    );
    expect(routePlanLine(sgnHkg)).toBe(
      'The fleet coordinator books the flight and the road transfers at both ends after approval.',
    );
  });

  test('road runs unless the only corridors are by air', () => {
    expect(roadRuns([])).toBe(true);
    expect(roadRuns([hcmBkk])).toBe(true);
    expect(roadRuns([hcmBkk, sgnHkg])).toBe(true);
    expect(roadRuns([sgnHkg])).toBe(false);
  });

  test('the other mode is named after the route shown', () => {
    const byAir = route({ mode: 'AIR', corridorId: 'c-air' });
    expect(alsoByLine([hcmBkk, byAir], hcmBkk)).toBe(' Also by air: choose on step 3.');
    expect(alsoByLine([hcmBkk, byAir], byAir)).toBe(' Also by road: choose on step 3.');
    expect(alsoByLine([hcmBkk], hcmBkk)).toBe('');
    expect(alsoByLine([], null)).toBe('');
  });
});

describe('the draft pass', () => {
  test('before anything is set, each row says its step', () => {
    expect(passRows(EMPTY_WIZARD, [], null, false)).toEqual([
      { label: 'Departs', value: null, step: 2 },
      { label: 'Arrival', value: null, step: 2 },
      { label: 'Borders', value: null, step: 2 },
      { label: 'Service', value: null, step: 3 },
    ]);
  });

  test('a too-soon date is bad on the pass only while its blocker stands', () => {
    const live = [blocker('LEAD_TIME_TOO_SHORT', 'departureDate')];
    const values = { ...EMPTY_WIZARD, departureDate: '2026-10-05' };
    expect(passRows(values, live, hcmBkk, false)[0]).toEqual({
      label: 'Departs',
      value: '5 Oct · too soon',
      mono: true,
      tone: 'bad',
    });
    // The places changed (to a domestic route, say): the blocker no longer stands.
    expect(passRows(values, [], hcmHan, false)[0]).toEqual({
      label: 'Departs',
      value: '5 Oct 2026',
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
    expect(passRows(values, [], hcmBkk, false).map((r) => r.value)).toEqual([
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
      [],
      hcmBkk,
      false,
    );
    expect(win[1]).toEqual({ label: 'Arrival', value: '31 Oct · 08:00–12:00', mono: true });
    expect(win[3].value).toBe('Road · private trailer');
    const air = passRows({ ...EMPTY_WIZARD, mode: 'AIR', airClass: 'BUSINESS' }, [], sgnHkg, false);
    expect(air[3].value).toBe('Air · business class');
    expect(passRows(EMPTY_WIZARD, [], null, true)[2]).toEqual({
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

describe('which field refusals a change retires', () => {
  const sent: WizardValues = {
    ...EMPTY_WIZARD,
    origin: { value: 'p1', label: 'Stable, Bangkok', city: 'Bangkok' },
    destination: { value: 'p1', label: 'Stable, Bangkok', city: 'Bangkok' },
    departureDate: '2026-11-20',
    arrivalMode: 'WINDOW',
    arriveOn: '2026-11-21',
    windowFrom: time('08:00'),
    windowUntil: time('09:00'),
    mode: 'ROAD',
    trailer: 'PRIVATE',
  };

  test('nothing changed keeps every refusal', () => {
    expect(retiredRefusals(['destination', 'arriveOn', 'mode'], sent, { ...sent })).toEqual([]);
  });

  test('the same place goes when either end changes', () => {
    const other = { value: 'p2', label: 'Stable, Kuala Lumpur', city: 'Kuala Lumpur' };
    expect(retiredRefusals(['destination'], sent, { ...sent, origin: other })).toEqual([
      'destination',
    ]);
    expect(retiredRefusals(['destination'], sent, { ...sent, destination: other })).toEqual([
      'destination',
    ]);
  });

  test('a window refusal goes with any window value, not with another step', () => {
    expect(retiredRefusals(['arriveOn'], sent, { ...sent, windowUntil: time('12:00') })).toEqual([
      'arriveOn',
    ]);
    expect(retiredRefusals(['arriveOn'], sent, { ...sent, flexible: true })).toEqual(['arriveOn']);
    expect(retiredRefusals(['arriveOn'], sent, { ...sent, vetEscort: true })).toEqual([]);
  });

  test('dates and mode options go with their own inputs', () => {
    expect(retiredRefusals(['departureDate'], sent, { ...sent, flexible: true })).toEqual([
      'departureDate',
    ]);
    expect(retiredRefusals(['mode'], sent, { ...sent, trailer: null })).toEqual(['mode']);
    expect(retiredRefusals(['mode'], sent, { ...sent, airClass: 'ECONOMY' })).toEqual(['mode']);
    expect(retiredRefusals(['mode'], sent, { ...sent, insurance: 'OWN_POLICY' })).toEqual([]);
  });

  test('any other field refusal goes when its own field changes', () => {
    expect(
      retiredRefusals(['specialInstructions'], sent, { ...sent, specialInstructions: 'Hay' }),
    ).toEqual(['specialInstructions']);
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

describe('versions of a returned request', () => {
  const v1 = {
    revisionNo: 1,
    submittedAt: '2026-09-26T02:14:00Z',
    note: 'Which stable?',
    returnedAt: '2026-09-28T02:41:00Z',
  };
  const returned = draft({
    status: 'INFO_REQUIRED',
    code: 'REQ-2026-0195',
    updatedAt: '2026-10-18T03:00:00Z',
    infoRequiredNote: 'Which stable?',
    revisions: [v1],
  });

  test('a draft and a returned request can be edited; nothing else can', () => {
    expect(editable('DRAFT')).toBe(true);
    expect(editable('INFO_REQUIRED')).toBe(true);
    expect(editable('SUBMITTED')).toBe(false);
    expect(editable('QUOTED')).toBe(false);
  });

  test('a version line says when it was sent and when it came back', () => {
    expect(versionLine(v1)).toBe('v1 · Submitted 26 Sep · returned 28 Sep');
    expect(
      versionLine({
        revisionNo: 2,
        submittedAt: '2026-09-30T04:00:00Z',
        note: null,
        returnedAt: null,
      }),
    ).toBe('v2 · Submitted 30 Sep');
  });

  test('a version line shows the ICT day: 18:30 UTC is already the next day', () => {
    expect(
      versionLine({
        revisionNo: 1,
        submittedAt: '2026-09-29T18:30:00Z',
        note: 'Which?',
        returnedAt: '2026-09-30T17:30:00Z',
      }),
    ).toBe('v1 · Submitted 30 Sep · returned 1 Oct');
  });

  test('the submit button names the version it sends', () => {
    expect(submitLabel(draft())).toBe('Submit request');
    expect(submitLabel(returned)).toBe('Send version 2');
  });

  test('the saved line says where the changes go', () => {
    expect(savedLine(draft({ updatedAt: '2026-10-18T03:00:00Z' }))).toBe(
      'Draft saved 18 Oct 2026.',
    );
    expect(savedLine(returned)).toBe(
      'Changes saved 18 Oct 2026. Send them as version 2 from Review.',
    );
  });
});

describe("the pass's chip", () => {
  test('a returned request needs an answer; a draft and a submitted one say so', () => {
    expect(passChip('INFO_REQUIRED')).toEqual({ tone: 'warn', label: 'Needs your answer' });
    expect(passChip('DRAFT')).toEqual({ tone: 'neutral', label: 'Draft' });
    expect(passChip('SUBMITTED')).toEqual({ tone: 'neutral', label: 'Submitted' });
  });
});
