import { describe, expect, test } from 'bun:test';

import { issueSchema, manualLineSchema, overrideSchema } from './schema';

const fixed = { label: 'Fixed', value: 'FIXED' };
const estimated = { label: 'Estimated', value: 'ESTIMATED' };
const groupH = { label: 'H · Surcharges', value: 'H' };

const manual = (over: Record<string, unknown> = {}) => ({
  group: groupH,
  description: 'Night parking at the border lot',
  quantity: 1,
  unitRate: 85,
  certainty: fixed,
  estimateNote: '',
  reason: 'The border lot charges per night',
  ...over,
});

const messages = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? [] : (r.error?.issues.map((i) => i.message) ?? []);

describe('overrideSchema', () => {
  test('an amount with a reason passes', () => {
    expect(overrideSchema.safeParse({ amount: 1200, reason: 'Own groom' }).success).toBe(true);
  });
  test('three decimals are refused', () => {
    expect(messages(overrideSchema.safeParse({ amount: 1.005, reason: 'x' }))).toContain(
      'Use at most 2 decimals.',
    );
  });
  test('a reason is required', () => {
    expect(messages(overrideSchema.safeParse({ amount: 10, reason: '  ' }))).toContain(
      'Say why the line is overridden.',
    );
  });
  test('a negative amount is refused, zero is allowed', () => {
    expect(overrideSchema.safeParse({ amount: -1, reason: 'x' }).success).toBe(false);
    expect(overrideSchema.safeParse({ amount: 0, reason: 'Waived' }).success).toBe(true);
  });
});

describe('manualLineSchema', () => {
  test('a fixed line passes without a note', () => {
    expect(manualLineSchema.safeParse(manual()).success).toBe(true);
  });
  test('an estimated line needs a note', () => {
    expect(messages(manualLineSchema.safeParse(manual({ certainty: estimated })))).toContain(
      'Say why this line may vary.',
    );
    expect(
      manualLineSchema.safeParse(manual({ certainty: estimated, estimateNote: 'Tariff' })).success,
    ).toBe(true);
  });
  test('quantity must be above zero; the reason and description are required', () => {
    expect(messages(manualLineSchema.safeParse(manual({ quantity: 0 })))).toContain(
      'Enter more than zero.',
    );
    expect(messages(manualLineSchema.safeParse(manual({ reason: '' })))).toContain(
      "Say what the catalog doesn't know.",
    );
    expect(messages(manualLineSchema.safeParse(manual({ description: '' })))).toContain(
      'Describe the line.',
    );
  });
});

describe('issueSchema', () => {
  test('the first version needs no note', () => {
    expect(issueSchema.safeParse({ versionNo: 1, changeNote: '' }).success).toBe(true);
  });
  test('a later version says what changed', () => {
    expect(messages(issueSchema.safeParse({ versionNo: 2, changeNote: ' ' }))).toContain(
      'Say what changed since version 1.',
    );
    expect(issueSchema.safeParse({ versionNo: 2, changeNote: 'Departure moved' }).success).toBe(
      true,
    );
  });
  test('at most 300 characters', () => {
    expect(issueSchema.safeParse({ versionNo: 2, changeNote: 'x'.repeat(301) }).success).toBe(
      false,
    );
  });
});
