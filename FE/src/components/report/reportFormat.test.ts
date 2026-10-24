import { describe, expect, test } from 'bun:test';

import { compactMoney, monthLabel } from './reportFormat';

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
});
