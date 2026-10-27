import { describe, expect, test } from 'bun:test';

import {
  bandsSchema,
  classSchema,
  LINE_FIELDS,
  type LineForm,
  lineSchema,
  POLICY_FIELDS,
  policySchema,
} from './schema';

const o = (value: string) => ({ value, label: value });

const LINE: LineForm = {
  everyCorridor: false,
  code: 'ISO_STALLION',
  group: o('B'),
  description: 'Pre-export isolation',
  basis: o('PER_DAY'),
  appliesToSex: o('STALLION'),
  appliesToTrailer: null,
  rate: 140,
  minCharge: null,
  defaultQuantity: null,
  certainty: o('FIXED'),
  estimateNote: '',
  coveredByRoadLeg: false,
};

/** The first message zod gives for each path, "path: message". */
const issues = (result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) => (result.success ? [] : result.error!.issues.map((i) => `${i.path.join('.')}: ${i.message}`));

describe('policySchema', () => {
  const valid = Object.fromEntries(POLICY_FIELDS.map((f) => [f.key, f.fallback ?? 1]));
  const stall = (value: number) =>
    policySchema.safeParse({ ...valid, STALL_PAYLOAD_KG: value, AIR_SHIPMENT_MAX_KG: 20000 })
      .success;

  test('the planning settings are whole numbers within their bounds (US-F3-22)', () => {
    const plan = (over: Record<string, number>) =>
      policySchema.safeParse({ ...valid, ...over }).success;
    expect(plan({ PLAN_START_HOUR: 23, PLAN_SPEED_KMH: 10 })).toBe(true);
    expect(plan({ PLAN_START_HOUR: 24 })).toBe(false);
    expect(plan({ PLAN_SPEED_KMH: 5 })).toBe(false);
    expect(plan({ PLAN_WELFARE_EVERY_HOURS: 0 })).toBe(false);
    expect(plan({ PLAN_BORDER_STOP_MIN: 1441 })).toBe(false);
  });

  test('the weight limits are whole kilograms from 1 to 99,999 (BR-Q-16)', () => {
    expect(stall(5504)).toBe(true);
    expect(stall(0)).toBe(false);
    expect(stall(100000)).toBe(false);
  });
});

describe('lineSchema', () => {
  test('a valid sex line passes', () => {
    expect(issues(lineSchema.safeParse(LINE))).toEqual([]);
  });

  test('a line for one sex leaves room for the sex the quotation adds', () => {
    expect(issues(lineSchema.safeParse({ ...LINE, description: 'x'.repeat(150) }))).toEqual([
      'description: A line for one sex can have at most 149 characters: the quotation adds the sex to it.',
    ]);
    expect(issues(lineSchema.safeParse({ ...LINE, description: 'x'.repeat(149) }))).toEqual([]);
    expect(
      issues(lineSchema.safeParse({ ...LINE, appliesToSex: null, description: 'x'.repeat(160) })),
    ).toEqual([]);
  });

  test('only a per-horse or per-day line can be for one sex', () => {
    expect(issues(lineSchema.safeParse({ ...LINE, basis: o('PER_SHIPMENT') }))).toEqual([
      'appliesToSex: Only a per-horse or per-day line can be for one sex.',
    ]);
    expect(issues(lineSchema.safeParse({ ...LINE, basis: o('PER_HORSE') }))).toEqual([]);
  });

  test('only a group A or G line can be left to a road leg', () => {
    expect(issues(lineSchema.safeParse({ ...LINE, coveredByRoadLeg: true }))).toEqual([
      'coveredByRoadLeg: Only a group A or G line is at an end of the move a road leg can cover.',
    ]);
    expect(
      issues(lineSchema.safeParse({ ...LINE, group: o('G'), coveredByRoadLeg: true })),
    ).toEqual([]);
  });

  test('money and hours have at most 2 decimals', () => {
    expect(issues(lineSchema.safeParse({ ...LINE, rate: 3.605 }))).toEqual([
      'rate: Use at most 2 decimals.',
    ]);
    expect(issues(lineSchema.safeParse({ ...LINE, rate: 3.6 }))).toEqual([]);
  });
});

describe('LINE_FIELDS', () => {
  test('the description and sex refusals land on their fields', () => {
    expect(LINE_FIELDS.DESCRIPTION).toBe('description');
    expect(LINE_FIELDS.APPLIES_TO_SEX).toBe('appliesToSex');
    expect(LINE_FIELDS.COVERED_BY_ROAD_LEG).toBe('coveredByRoadLeg');
  });
});

describe('classSchema', () => {
  test('a position rate has at most 2 decimals', () => {
    const value = { serviceClass: o('BUSINESS'), widthPerHorseIn: 48, positionRate: 16800.505 };
    expect(issues(classSchema.safeParse(value))).toEqual(['positionRate: Use at most 2 decimals.']);
  });
});

describe('bandsSchema', () => {
  const bands = (
    minHorses: number | null,
    maxHorses: number | null,
    discountPct: number | null,
  ) => ({
    ownBands: false,
    bands: [{ minHorses, maxHorses, discountPct }],
  });

  test('horse counts are whole numbers, in words', () => {
    expect(issues(bandsSchema.safeParse(bands(1.5, 3.5, 0)))).toEqual([
      'bands.0.minHorses: Use a whole number of horses.',
      'bands.0.maxHorses: Use a whole number of horses.',
    ]);
  });

  test('a discount is 0 to 100% with at most 2 decimals, in words', () => {
    expect(issues(bandsSchema.safeParse(bands(1, null, 2.505)))).toEqual([
      'bands.0.discountPct: Use at most 2 decimals.',
    ]);
    expect(issues(bandsSchema.safeParse(bands(1, null, 101)))).toEqual([
      'bands.0.discountPct: A discount must be between 0 and 100%.',
    ]);
    expect(issues(bandsSchema.safeParse(bands(1, null, 12.5)))).toEqual([]);
  });
});
