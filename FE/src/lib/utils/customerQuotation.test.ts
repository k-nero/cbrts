import { describe, expect, test } from 'bun:test';

import type { CustomerQuoteGroup } from '@/interfaces';

import {
  quotedPassChip,
  cancellationToday,
  cancelledText,
  noticeBandLabel,
  deadlineText,
  estimateVerdict,
  largestLine,
  moneyHead,
  departsText,
  moneyRows,
  owedKind,
  quotationCallout,
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

describe('departsText', () => {
  test('a calendar day is read as written, never shifted by a time zone', () => {
    expect(departsText('2026-12-01', 0)).toBe('1 Dec 2026');
    expect(departsText('2026-12-01', 3)).toBe('1 Dec 2026 ±3 d');
    expect(departsText(null, 0)).toBe('—');
  });
});

describe('quotationCallout', () => {
  const ref = { code: 'Q-2026-0189', versionNo: 2, validUntil: '2026-10-27T16:59:59.999Z' };
  test('an issued quotation waits for an answer', () => {
    expect(quotationCallout({ ...ref, status: 'ISSUED' })).toEqual({
      tone: 'info',
      title: 'Your quotation is ready: Q-2026-0189 v2.',
      body: 'It holds its price until 27 Oct 2026.',
    });
  });
  test('an expired one says so', () => {
    expect(quotationCallout({ ...ref, status: 'EXPIRED' })).toEqual({
      tone: 'info',
      title: 'Your quotation Q-2026-0189 v2 expired on 27 Oct 2026.',
      body: 'A logistics manager can re-price it from the rate catalog in force now.',
    });
  });
  test('an accepted one says so', () => {
    expect(quotationCallout({ ...ref, status: 'ACCEPTED' }).title).toBe(
      'You accepted quotation Q-2026-0189 v2.',
    );
  });
  test('a declined one says so, not that it is ready', () => {
    expect(quotationCallout({ ...ref, status: 'DECLINED' }).title).toBe(
      'You declined quotation Q-2026-0189 v2.',
    );
  });
});

describe('cancellationToday', () => {
  const bands = [
    { minDays: 0, maxDays: 6, pct: 100, current: false },
    { minDays: 14, maxDays: 29, pct: 25, current: true },
  ];

  test('names the current band and the days left', () => {
    expect(cancellationToday({ cancellation: { daysToDeparture: 20, bands } })).toBe(
      'If you cancel before approval, the fee today is 25% of the total, with 20 days to departure.',
    );
  });

  test('a departure already past counts as no notice', () => {
    expect(
      cancellationToday({
        cancellation: { daysToDeparture: -2, bands: [{ ...bands[0], current: true }] },
      }),
    ).toBe(
      'If you cancel before approval, the fee today is 100% of the total, with 0 days to departure.',
    );
  });
});

describe('cancelledText', () => {
  test('a fee taken from the quotation', () => {
    expect(cancelledText('2026-09-26T02:14:00Z', 25)).toBe(
      'You cancelled on 26 Sep 2026. The fee is 25% of the quotation total.',
    );
  });

  test('no quotation, no fee', () => {
    expect(cancelledText('2026-09-26T02:14:00Z', 0)).toBe(
      'You cancelled on 26 Sep 2026. No fee, as no quotation was issued.',
    );
  });
});

describe('quotedPassChip', () => {
  test('follows the answer, and a cancelled request wins over the version', () => {
    expect(quotedPassChip({ status: 'ISSUED', requestStatus: 'QUOTED', versionNo: 2 })).toEqual({
      tone: 'info',
      label: 'Quoted · v2',
    });
    expect(
      quotedPassChip({ status: 'ACCEPTED', requestStatus: 'CUSTOMER_ACCEPTED', versionNo: 2 }),
    ).toEqual({ tone: 'ok', label: 'Accepted · v2' });
    expect(quotedPassChip({ status: 'ACCEPTED', requestStatus: 'APPROVED', versionNo: 2 })).toEqual(
      { tone: 'ok', label: 'Approved · v2' },
    );
    expect(quotedPassChip({ status: 'ISSUED', requestStatus: 'CANCELLED', versionNo: 2 })).toEqual({
      tone: 'neutral',
      label: 'Cancelled',
    });
  });
});
