import { describe, expect, test } from 'bun:test';

import {
  emptyLeg,
  emptyStop,
  recalculatedTimes,
  routeChecks,
  routeDraftSchema,
  toForm,
  toInput,
  totals,
} from './routeDraft';

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

  test('a stop planned before the horses leave the stop before it is refused; untimed stops are skipped', () => {
    const form = toForm(null, job);
    form.stops.splice(1, 0, { ...emptyStop('WELFARE'), place: { value: 'w', label: 'W' } });
    form.stops.splice(2, 0, { ...emptyStop('WELFARE'), place: { value: 'w2', label: 'W2' } });
    form.legs.push(emptyLeg(), emptyLeg());
    form.stops[0].plannedAt = '2026-11-02T08:00';
    form.stops[1].plannedAt = '2026-11-02T12:00';
    form.stops[1].stayMin = 45;
    form.stops[3].plannedAt = '2026-11-02T12:30';
    const issues = routeDraftSchema.safeParse(form).error?.issues;
    expect(issues?.map((i) => i.path.join('.'))).toEqual(['stops.3.plannedAt']);
    expect(issues?.[0].message).toBe(
      'Before the horses leave stop 2 at 2 Nov, 12:45. Plan it later, or recalculate the times.',
    );
    form.stops[3].plannedAt = '2026-11-02T12:45';
    expect(routeDraftSchema.safeParse(form).success).toBe(true);
  });
});

describe('recalculatedTimes', () => {
  test('each stop is the one before plus its stay and the leg time, up to the first leg with no time', () => {
    const form = toForm(null, job);
    form.stops.splice(1, 0, emptyStop('BORDER'), emptyStop('WELFARE'));
    form.legs.push(emptyLeg(), emptyLeg());
    expect(recalculatedTimes(form)).toBeNull();

    form.stops[0].plannedAt = '2026-11-02T22:00';
    form.stops[1].stayMin = 90;
    form.legs[0].plannedMin = 120;
    form.legs[1].plannedMin = 60;
    form.stops[3].plannedAt = '2026-11-01T09:00';
    expect(recalculatedTimes(form)).toEqual({
      times: ['2026-11-02T22:00', '2026-11-03T00:00', '2026-11-03T02:30', '2026-11-01T09:00'],
      missingLeg: 3,
    });
    form.legs[2].plannedMin = 30;
    expect(recalculatedTimes(form)?.times.at(-1)).toBe('2026-11-03T03:00');
  });
});

describe('routeChecks', () => {
  const stop = (seq: number, kind: string, plannedAt: string | null, plannedStayMin?: number) => ({
    id: `s${seq}`,
    seq,
    kind,
    plannedAt,
    plannedStayMin,
  });
  const routed = (stops: ReturnType<typeof stop>[], welfareStopsNeeded: number) =>
    ({ stops, legs: [], welfareStopsNeeded }) as unknown as RoutePlan;

  test('times running backwards and a missing welfare stop hold the route back', () => {
    const checks = routeChecks(
      routed(
        [
          stop(1, 'PICKUP', '2026-11-02T01:00:00Z'),
          stop(2, 'BORDER', '2026-11-02T05:00:00Z', 90),
          stop(3, 'WELFARE', '2026-11-02T03:00:00Z', 45),
          stop(4, 'DELIVERY', null),
        ],
        2,
      ),
      job,
    );
    expect(checks.map((c) => [c.key, c.ok, c.blocks])).toEqual([
      ['order', false, true],
      ['untimed', false, false],
      ['welfare', false, true],
    ]);
    expect(checks[0].label).toBe(
      'Stop 3 is planned at 2 Nov, 10:00, before the horses leave stop 2 at 2 Nov, 13:30.',
    );
    expect(checks[2].label).toBe('1 of the 2 welfare stops the drive needs.');
  });

  test('a delivery after the arrival window is a failing check', () => {
    const late = { ...job, windowEnd: '2026-11-02T07:00:00Z' } as JobDetail;
    const checks = routeChecks(
      routed(
        [stop(1, 'PICKUP', '2026-11-02T01:00:00Z'), stop(2, 'DELIVERY', '2026-11-02T08:00:00Z')],
        0,
      ),
      late,
    );
    expect(checks.every((c) => c.key === 'window' || c.ok)).toBe(true);
    expect(checks.find((c) => c.key === 'window')).toMatchObject({
      ok: false,
      label: 'The delivery at 2 Nov, 15:00 is after the arrival window closes at 2 Nov, 14:00.',
    });
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
