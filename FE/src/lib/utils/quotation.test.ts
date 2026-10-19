import { describe, expect, test } from 'bun:test';

import {
  classOptions,
  conflictMessage,
  money,
  moneyOrDash,
  quoteSummary,
  readinessText,
  readinessView,
  repriceOffer,
} from './quotation';

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
    expect(classOptions('AIR', fits)).toEqual([
      { value: 'ECONOMY', label: 'Economy', fits: true },
      { value: 'BUSINESS', label: 'Business', fits: true },
      { value: 'FIRST', label: 'First', fits: true },
    ]);
  });

  test('only the achievable classes fit after a refusal', () => {
    expect(classOptions('AIR', refused).map((o) => [o.value, o.fits])).toEqual([
      ['ECONOMY', false],
      ['BUSINESS', false],
      ['FIRST', true],
    ]);
  });

  test('a road move has no classes', () => {
    expect(classOptions('ROAD', null)).toEqual([]);
  });

  test('an air class with no catalog row still offers every class', () => {
    expect(classOptions('AIR', null).map((o) => o.value)).toEqual(['ECONOMY', 'BUSINESS', 'FIRST']);
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

describe('quoteSummary', () => {
  const draft = (over: Partial<QuotationDraft['request']>, airClass: QuotationDraft['airClass']) =>
    ({
      versionNo: 1,
      status: 'DRAFT',
      airClass,
      request: {
        club: 'Saigon Turf Club',
        horseCount: 2,
        mode: 'AIR',
        trailer: null,
        departureDate: '2026-11-20',
        dateFlexDays: 0,
        ...over,
      },
    }) as QuotationDraft;

  test('an air quotation names the priced class', () => {
    expect(quoteSummary(draft({}, 'BUSINESS'))).toBe(
      'v1 draft · Saigon Turf Club · 2 horses · air, business · departs 20 Nov 2026',
    );
  });

  test('a road quotation names the trailer and the flexible dates', () => {
    expect(
      quoteSummary(
        draft({ mode: 'ROAD', trailer: 'SHARED', horseCount: 1, dateFlexDays: 3 }, null),
      ),
    ).toBe('v1 draft · Saigon Turf Club · 1 horse · road, shared load · departs 20 Nov 2026 ±3 d');
  });
});

describe('readinessView', () => {
  const q = (over: Partial<QuotationDraft>) =>
    ({
      readiness: { ready: true, pricedLines: 13, lineCount: 13 },
      repriceNeeded: false,
      fit: { positions: 1, widthUsedIn: 96, refusal: null, achievableClasses: [] },
      airClass: 'BUSINESS',
      missing: [],
      ...over,
    }) as QuotationDraft;

  test('ready', () => {
    expect(readinessView(q({}))).toEqual({
      tone: 'ok',
      chip: 'Ready',
      text: 'All 13 lines priced',
    });
  });

  test('missing rates', () => {
    expect(
      readinessView(
        q({
          readiness: { ready: false, pricedLines: 11, lineCount: 13 },
          missing: [{ group: 'C', description: 'x', why: 'y' }],
        }),
      ),
    ).toEqual({ tone: 'neutral', chip: 'Waiting on rates', text: '11 of 13 lines priced' });
  });

  test('a class the horses cannot fit', () => {
    expect(
      readinessView(
        q({
          readiness: { ready: false, pricedLines: 12, lineCount: 12 },
          airClass: 'ECONOMY',
          fit: { positions: 0, widthUsedIn: 0, refusal: 'x', achievableClasses: ['FIRST'] },
        }),
      ),
    ).toEqual({ tone: 'neutral', chip: 'Not ready', text: "The horses don't fit economy." });
  });

  test('a request changed since pricing', () => {
    expect(
      readinessView(
        q({ readiness: { ready: false, pricedLines: 13, lineCount: 13 }, repriceNeeded: true }),
      ),
    ).toEqual({
      tone: 'neutral',
      chip: 'Not ready',
      text: 'The request changed since this was priced.',
    });
  });
});

describe('conflictMessage', () => {
  test("a 409 gives the server's sentence", () => {
    const error = {
      response: {
        status: 409,
        data: {
          error: 'REQUEST_NOT_IN_REVIEW',
          message: 'Only a request in review can be quoted.',
        },
      },
    };
    expect(conflictMessage(error)).toBe('Only a request in review can be quoted.');
  });

  test('anything else is not a conflict', () => {
    expect(conflictMessage({ response: { status: 400, data: { message: 'x' } } })).toBeNull();
    expect(conflictMessage(new Error('offline'))).toBeNull();
  });
});
