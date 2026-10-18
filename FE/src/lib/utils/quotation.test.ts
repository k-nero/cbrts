import { describe, expect, test } from 'bun:test';

import { classOptions, money, moneyOrDash, readinessText, repriceOffer } from './quotation';

import type { QuotationDraft, StallFit } from '@/interfaces';

describe('money', () => {
  test('dollars with grouping and cents', () => {
    expect(money(16800)).toBe('$16,800.00');
    expect(money(0.5)).toBe('$0.50');
  });

  test('a missing amount is a dash', () => {
    expect(moneyOrDash(null)).toBe('—');
    expect(moneyOrDash(1450)).toBe('$1,450.00');
  });
});

describe('readinessText', () => {
  test('every line priced', () => {
    expect(readinessText({ ready: true, pricedLines: 16, lineCount: 16 })).toBe(
      'All 16 lines priced',
    );
  });

  test('some lines without a rate', () => {
    expect(readinessText({ ready: false, pricedLines: 14, lineCount: 16 })).toBe(
      '14 of 16 lines priced',
    );
  });
});

describe('classOptions', () => {
  const fits: StallFit = { positions: 1, widthUsedIn: 96, refusal: null, achievableClasses: [] };
  const refused: StallFit = {
    positions: 0,
    widthUsedIn: 0,
    refusal: 'Lotus Crown is size XL (96 in); business gives 48 in.',
    achievableClasses: ['FIRST'],
  };

  test('all three classes when the horses fit', () => {
    expect(classOptions(fits, 'BUSINESS')).toEqual([
      { value: 'ECONOMY', label: 'Economy', fits: true },
      { value: 'BUSINESS', label: 'Business', fits: true },
      { value: 'FIRST', label: 'First', fits: true },
    ]);
  });

  test('only the achievable classes fit after a refusal', () => {
    expect(classOptions(refused, 'BUSINESS').map((o) => [o.value, o.fits])).toEqual([
      ['ECONOMY', false],
      ['BUSINESS', false],
      ['FIRST', true],
    ]);
  });

  test('a road move has no classes', () => {
    expect(classOptions(null, 'BUSINESS')).toEqual([]);
  });
});

describe('repriceOffer', () => {
  const draft = (pinned: number, latest: number | null) =>
    ({
      pinnedVersion: { id: 'v', versionNo: pinned },
      latestPublishedVersionNo: latest,
    }) as QuotationDraft;

  test('a newer published catalog is offered', () => {
    expect(repriceOffer(draft(2, 3))).toBe('Re-price on v3');
  });

  test('nothing to offer on the latest catalog', () => {
    expect(repriceOffer(draft(3, 3))).toBeNull();
    expect(repriceOffer(draft(3, null))).toBeNull();
  });
});
