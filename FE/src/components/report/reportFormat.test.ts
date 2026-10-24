import { describe, expect, test } from 'bun:test';

import { compactMoney, monthLabel, niceTicks } from './reportFormat';

describe('report figures', () => {
  test('money is short on a chart', () => {
    expect(compactMoney(412_800)).toBe('$412.8k');
    expect(compactMoney(950)).toBe('$950');
    expect(compactMoney(-1_708.21)).toBe('-$1.7k');
    expect(compactMoney(1_250_000)).toBe('$1.3m');
  });

  test('a month in words', () => {
    expect(monthLabel('2026-10')).toBe('Oct');
    expect(monthLabel('2026-01', true)).toBe('Jan 2026');
  });

  test('ticks are round and reach the top of the data', () => {
    expect(niceTicks(412_800)).toEqual([0, 200_000, 400_000, 600_000]);
    expect(niceTicks(9_575.79)).toEqual([0, 5_000, 10_000]);
    expect(niceTicks(0)).toEqual([0, 1]);
  });
});
