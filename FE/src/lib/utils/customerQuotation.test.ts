import { describe, expect, test } from 'bun:test';

import type { CustomerQuoteGroup } from '@/interfaces';

import {
  noticeBandLabel,
  deadlineText,
  estimateVerdict,
  largestLine,
  moneyHead,
  moneyRows,
  owedKind,
  shareText,
} from './customerQuotation';

const line = (description: string, amount: number) => ({
  description,
  basisText: '',
  quantity: 1,
  unitRate: amount,
  amount,
  certainty: 'FIXED' as const,
  estimateNote: null,
  overridden: false,
  catalogAmount: amount,
  overrideReason: null,
  manual: false,
  manualReason: null,
});

const groups: CustomerQuoteGroup[] = [
  { code: 'A', name: 'Ground transport · origin', subtotal: 490, lines: [line('Transfer', 490)] },
  {
    code: 'C',
    name: 'Air freight',
    subtotal: 17750,
    lines: [line('Air stall position, business', 16800), line('Handling', 950)],
  },
  { code: 'H', name: 'Surcharges', subtotal: 30, lines: [line('Waiting', 30)] },
];

describe('moneyRows', () => {
  const rows = moneyRows(groups, { subtotal: 18270, total: 22000 });
  test('one row per group plus fees, fuel and cover, largest first', () => {
    expect(rows.map((r) => r.name)).toEqual([
      'Air freight',
      'Fees, fuel and cover',
      'Ground transport · origin',
      'Surcharges',
    ]);
    expect(rows[1]).toEqual({
      code: null,
      name: 'Fees, fuel and cover',
      amount: 3730,
      share: 3730 / 22000,
    });
  });
  test('the shares add up to the whole', () => {
    expect(rows.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1, 6);
  });
  test('the head names the largest share', () => {
    expect(moneyHead(rows)).toBe('Air freight is 81% of the total');
  });
});

describe('shareText', () => {
  test('under one percent', () => expect(shareText(0.004)).toBe('<1%'));
  test('rounded percent', () => expect(shareText(0.473)).toBe('47%'));
});

describe('largestLine', () => {
  test('the stall line on an air quote', () => {
    expect(largestLine(groups, 22000)).toEqual({
      description: 'Air stall position, business',
      amount: 16800,
      share: 16800 / 22000,
    });
  });
});

describe('estimateVerdict', () => {
  test('inside and outside the range', () => {
    expect(estimateVerdict({ low: 7400, high: 10100, inside: true })).toEqual({
      tone: 'ok',
      label: 'Inside your range',
    });
    expect(estimateVerdict({ low: 7400, high: 8000, inside: false })).toEqual({
      tone: 'warn',
      label: 'Outside your range',
    });
  });
  test('no range kept', () => expect(estimateVerdict(null)).toBeNull());
});

describe('noticeBandLabel', () => {
  test('labels follow the stored days', () => {
    expect(noticeBandLabel({ minDays: 30, maxDays: null })).toBe('30 days or more');
    expect(noticeBandLabel({ minDays: 14, maxDays: 29 })).toBe('14–29 days');
    expect(noticeBandLabel({ minDays: 7, maxDays: 13 })).toBe('7–13 days');
    expect(noticeBandLabel({ minDays: 0, maxDays: 6 })).toBe('Under 7 days');
  });
});

describe('deadlineText', () => {
  const until = '2026-10-27T16:59:59.999Z';
  test('days left, and the date', () => {
    expect(deadlineText(until, '2026-10-23T03:00:00Z')).toEqual({
      line1: 'Due in 4 days',
      line2: '27 Oct 2026',
    });
  });
  test('the last day', () => {
    expect(deadlineText(until, '2026-10-27T03:00:00Z').line1).toBe('Due today');
  });
  test('past it', () => {
    expect(deadlineText(until, '2026-10-28T03:00:00Z').line1).toBe('Expired');
  });
});

describe('owedKind', () => {
  test('only an issued quotation waits for an answer', () => {
    expect(owedKind('ISSUED')).toBe('answer');
    expect(owedKind('EXPIRED')).toBe('expired');
    expect(owedKind('ACCEPTED')).toBe('accepted');
    expect(owedKind('DECLINED')).toBe('declined');
  });
});

describe('moneyRows with no lines', () => {
  test('nothing to draw', () => {
    expect(moneyRows([], { subtotal: 4200, total: 4200 })).toEqual([]);
    expect(moneyHead([])).toBe('');
  });
});
