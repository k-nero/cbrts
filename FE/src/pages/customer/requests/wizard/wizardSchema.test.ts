import { describe, expect, test } from 'bun:test';

import { wizardSchema } from './wizardSchema';

import { EMPTY_WIZARD, type WizardValues } from '@/lib/utils';

const win = (from: string | null, until: string | null): WizardValues => ({
  ...EMPTY_WIZARD,
  arrivalMode: 'WINDOW',
  arriveOn: '2026-10-31',
  windowFrom: from ? { value: from, label: from } : null,
  windowUntil: until ? { value: until, label: until } : null,
});
const messages = (v: WizardValues) =>
  wizardSchema.safeParse(v).error?.issues.map((i) => i.message) ?? [];

describe('the arrival window, in the backend R-04 sentences', () => {
  test('both times are needed', () => {
    expect(messages(win('08:00', null))).toEqual([
      'An arrival window needs both a start and an end.',
    ]);
  });

  test('the end comes after the start', () => {
    expect(messages(win('12:00', '08:00'))).toEqual(['The arrival window ends before it starts.']);
  });

  test('at least 3 hours', () => {
    expect(messages(win('08:00', '10:30'))).toEqual([
      'An arrival window is at least 3 hours; 08:00–10:30 is shorter.',
    ]);
  });

  test('a 4-hour window passes, and any time ignores the times', () => {
    expect(messages(win('08:00', '12:00'))).toEqual([]);
    expect(messages({ ...win('12:00', '08:00'), arrivalMode: 'ANY_TIME' })).toEqual([]);
  });

  test('a window needs its day', () => {
    expect(messages({ ...win('08:00', '12:00'), arriveOn: null })).toEqual([
      'An arrival window needs both a start and an end.',
    ]);
  });
});
