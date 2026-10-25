import { describe, expect, test } from 'bun:test';

import { addRuleSchema, countrySchema, ruleSchema } from './schema';

const shape = (value: string) => ({ label: value, value });
const rule = (over: Record<string, unknown>) => ({
  ruleKind: shape('WINDOW_BEFORE_DEPARTURE'),
  minDays: null,
  maxDays: 60,
  mandatory: true,
  description: '',
  ...over,
});

describe('countrySchema', () => {
  test('takes a two-letter code in either case', () => {
    expect(countrySchema.safeParse({ code: 'us', name: 'United States' }).success).toBe(true);
  });

  test('refuses a three-letter or numeric code', () => {
    expect(countrySchema.safeParse({ code: 'USA', name: 'United States' }).success).toBe(false);
    expect(countrySchema.safeParse({ code: 'U1', name: 'United States' }).success).toBe(false);
  });
});

describe('ruleSchema', () => {
  test('a window before departure needs its days', () => {
    expect(ruleSchema.safeParse(rule({ maxDays: null })).success).toBe(false);
  });

  test('presence only needs no days', () => {
    expect(
      ruleSchema.safeParse(rule({ ruleKind: shape('PRESENCE_ONLY'), maxDays: null })).success,
    ).toBe(true);
  });

  test("a booster window's fewest days can't exceed its most", () => {
    const parsed = ruleSchema.safeParse(
      rule({ ruleKind: shape('BOOSTER_WINDOW'), minDays: 200, maxDays: 180 }),
    );
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0].path).toEqual(['minDays']);
  });

  test('adding a rule needs a document', () => {
    const parsed = addRuleSchema.safeParse({ ...rule({}), documentType: null });
    expect(parsed.error?.issues[0].path).toEqual(['documentType']);
  });
});
