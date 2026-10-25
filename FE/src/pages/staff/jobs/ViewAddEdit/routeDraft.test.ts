import { describe, expect, test } from 'bun:test';

import { emptyLeg, emptyStop, routeDraftSchema, toForm, toInput, totals } from './routeDraft';

import type { JobDetail, RoutePlan } from '@/interfaces';

const job = {
  id: 'job-41',
  originPlace: { id: 'hcm', name: 'Phú Thọ training centre' },
  destinationPlace: { id: 'pnh', name: 'Phnom Penh Equestrian Centre' },
} as unknown as JobDetail;

const plan = {
  stops: [
    {
      id: 's2',
      seq: 2,
      kind: 'BORDER',
      borderCrossingId: 'bavet',
      borderCrossingName: 'Mộc Bài – Bavet',
    },
    { id: 's1', seq: 1, kind: 'PICKUP', jobId: 'job-41', placeId: 'hcm', placeName: 'Phú Thọ' },
    {
      id: 's3',
      seq: 3,
      kind: 'AIRPORT_OUT',
      placeId: 'pnh-air',
      placeName: 'Techo',
      plannedStayMin: 240,
    },
    { id: 's4', seq: 4, kind: 'TRANSFER', jobId: 'job-40', placeId: 'hkg', placeName: 'HKIA' },
  ],
  legs: [
    { id: 'l1', seq: 1, fromStopId: 's1', toStopId: 's2', mode: 'ROAD', distanceKm: 70 },
    {
      id: 'l3',
      seq: 3,
      fromStopId: 's3',
      toStopId: 's4',
      mode: 'AIR',
      flight: { airline: 'Cathay Cargo', flightNo: 'CX 2071', stallCapacity: 6, allocations: [] },
    },
  ],
} as unknown as RoutePlan;

describe('toForm', () => {
  test('a job with no route starts from its pickup and delivery places', () => {
    const form = toForm(null, job);
    expect(form.stops.map((s) => [s.kind.value, s.place?.value, s.jobId])).toEqual([
      ['PICKUP', 'hcm', 'job-41'],
      ['DELIVERY', 'pnh', 'job-41'],
    ]);
    expect(form.legs).toHaveLength(1);
  });

  test('a route is read in stop order, with the leg between each pair and a road leg where one is missing', () => {
    const form = toForm(plan, job);
    expect(form.stops.map((s) => s.kind.value)).toEqual([
      'PICKUP',
      'BORDER',
      'AIRPORT_OUT',
      'TRANSFER',
    ]);
    expect(form.stops[1].crossing?.value).toBe('bavet');
    expect(form.legs.map((l) => l.mode.value)).toEqual(['ROAD', 'ROAD', 'AIR']);
    expect(form.legs[0].distanceKm).toBe(70);
    expect(form.legs[2].flightNo).toBe('CX 2071');
  });
});

describe('toInput', () => {
  test('stops are numbered from 1 and each leg joins a stop to the next', () => {
    const input = toInput(toForm(plan, job), job);
    expect(input.stops.map((s) => s.seq)).toEqual([1, 2, 3, 4]);
    expect(input.legs.map((l) => [l.fromStopSeq, l.toStopSeq, l.mode])).toEqual([
      [1, 2, 'ROAD'],
      [2, 3, 'ROAD'],
      [3, 4, 'AIR'],
    ]);
    expect(input.legs[2].flight?.airline).toBe('Cathay Cargo');
  });

  test("another job's stop keeps its job; a new pickup or hand-on is this job's; a border names its crossing only", () => {
    const form = toForm(plan, job);
    form.stops.push({ ...emptyStop('DELIVERY'), place: { value: 'shatin', label: 'Sha Tin' } });
    form.legs.push(emptyLeg());
    const input = toInput(form, job);
    expect(input.stops[3].jobId).toBe('job-40');
    expect(input.stops[4].jobId).toBe('job-41');
    expect(input.stops[1]).toMatchObject({ jobId: null, placeId: null, borderCrossingId: 'bavet' });
  });
});

describe('routeDraftSchema', () => {
  test('a route starts with a pickup and ends with a delivery or a hand-on', () => {
    const form = toForm(null, job);
    expect(routeDraftSchema.safeParse(form).success).toBe(true);
    form.stops.reverse();
    expect(routeDraftSchema.safeParse(form).success).toBe(false);
  });

  test('a border stop needs its crossing, and an air leg its airline and flight number', () => {
    const form = toForm(null, job);
    form.stops.splice(1, 0, emptyStop('BORDER'));
    form.legs.push({ ...emptyLeg(), mode: { value: 'AIR', label: 'Air' } });
    const issues = routeDraftSchema.safeParse(form).error?.issues.map((i) => i.path.join('.'));
    expect(issues).toEqual(
      expect.arrayContaining(['stops.1.crossing', 'legs.1.airline', 'legs.1.flightNo']),
    );
  });
});

describe('totals', () => {
  test('distance adds up the legs; duration runs from the first planned stop to the last', () => {
    const form = toForm(null, job);
    form.stops[0].plannedAt = '2026-11-02T08:00';
    form.stops[1].plannedAt = '2026-11-02T14:30';
    form.legs[0].distanceKm = 240;
    expect(totals(form)).toEqual({ distanceKm: 240, durationMin: 390 });
  });

  test('without planned times, duration is the legs and the stays between them; nothing known is null', () => {
    const form = toForm(null, job);
    expect(totals(form)).toEqual({ distanceKm: null, durationMin: null });
    form.stops[0].stayMin = 45;
    form.legs[0].plannedMin = 120;
    expect(totals(form).durationMin).toBe(165);
  });
});
