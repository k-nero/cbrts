import { describe, expect, test } from 'bun:test';

import type { QuoteLineRow, Readiness } from '@/interfaces';

import {
  changedSince,
  classOptions,
  conflictMessage,
  declinedBefore,
  declinedTitle,
  depositText,
  issueBlocker,
  statusActions,
  overrideDefaults,
  validityText,
  money,
  moneyOrDash,
  quoteSummary,
  readinessText,
  readinessView,
  repriceOffer,
  fitLine,
} from './quotation';

import type { QuotationDraft, QuotationVersion, StallFit } from '@/interfaces';

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

describe('fitLine', () => {
  test("the width, the positions and the horses' weight (BR-Q-16)", () => {
    expect(fitLine({ positions: 2, widthUsedIn: 144, totalWeightKg: 1540 })).toBe(
      '144 in across 2 positions of 96 in · 1,540 kg of horses.',
    );
  });

  test('without a weight (an unknown one, or a quotation issued before weights were kept)', () => {
    expect(fitLine({ positions: 1, widthUsedIn: 48, totalWeightKg: null })).toBe(
      '48 in across 1 position of 96 in.',
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
      { value: 'ECONOMY', label: 'Economy', fits: true, disabled: false },
      { value: 'BUSINESS', label: 'Business', fits: true, disabled: false },
      { value: 'FIRST', label: 'First', fits: true, disabled: false },
    ]);
  });

  test('every class is disabled while a change is pending', () => {
    expect(classOptions('AIR', fits, true).map((o) => o.disabled)).toEqual([true, true, true]);
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
      'v1 draft · Saigon Turf Club · 2 horses · air, business class · departs 20 Nov 2026',
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

// --- slice 6: issuing -------------------------------------------------------------------------------

const readiness = (blockers: string[]): Readiness => ({
  ready: blockers.length === 0,
  pricedLines: 9,
  lineCount: 9,
  blockers,
});

const line = (over: Partial<QuoteLineRow> = {}): QuoteLineRow => ({
  id: 'l1',
  lineKey: 'GROOM',
  description: 'Flying groom',
  basisText: 'one per three horses · 2 ÷ 3, rounded up = 1',
  quantity: 1,
  unitRate: 1450,
  amount: 1450,
  certainty: 'FIXED',
  estimateNote: null,
  source: 'CATALOG',
  catalogAmount: 1450,
  overrideAmount: null,
  overrideReason: null,
  manual: false,
  manualReason: null,
  ...over,
});

describe('issueBlocker', () => {
  test('nothing blocks an issued version or a ready draft', () => {
    expect(issueBlocker(null)).toBeNull();
    expect(issueBlocker(readiness([]))).toBeNull();
  });
  test('names the first blocker', () => {
    expect(
      issueBlocker(
        readiness([
          '1 rate is missing on Hanoi → Vientiane.',
          'Rate catalog v5 has no deposit percentage.',
        ]),
      ),
    ).toBe('1 rate is missing on Hanoi → Vientiane.');
  });
});

describe('changedSince', () => {
  const previous = { versionNo: 1, total: 9120.4, amountsByKey: { GROOM: 1450 } };
  test('a changed amount says what it was', () => {
    expect(changedSince(line({ amount: 1200, overrideAmount: 1200 }), previous)).toBe(
      'was $1,450.00',
    );
  });
  test("what it was reads in the quotation's currency", () => {
    expect(changedSince(line({ amount: 1200 }), previous, 'EUR')).toBe('was €1,450.00');
  });
  test('a line the previous version did not have is new', () => {
    expect(changedSince(line({ lineKey: 'MANUAL:abc' }), previous)).toBe('new');
  });
  test('an unchanged line, or no previous version, says nothing', () => {
    expect(changedSince(line(), previous)).toBeNull();
    expect(changedSince(line({ amount: 1200 }), null)).toBeNull();
  });
});

describe('validityText', () => {
  test('a draft counts its days from issue', () => {
    expect(validityText(null, 7)).toEqual({ line1: 'In 7 days', line2: 'from issue' });
  });
  test('an issued version names its last day', () => {
    expect(validityText('2026-10-27T16:59:59.999Z', 7)).toEqual({
      line1: 'Until 27 Oct 2026',
      line2: 'end of day, Vietnam time',
    });
  });
  test('no validity in the catalog', () => {
    expect(validityText(null, null)).toEqual({ line1: '—', line2: 'no validity in the catalog' });
  });
});

describe('depositText', () => {
  test('percentage and amount', () => {
    expect(depositText({ pct: 30, amount: 2627.02 })).toBe('30% · $2,627.02');
  });
  test('a draft shows the percentage of the total to come', () => {
    expect(depositText(null)).toBe('—');
  });
  test("in the quotation's currency", () => {
    expect(depositText({ pct: 30, amount: 2627.02 }, 'EUR')).toBe('30% · €2,627.02');
  });
});

describe('overrideDefaults', () => {
  test('starts from the catalog amount', () => {
    expect(overrideDefaults(line())).toEqual({ amount: '1450.00', reason: '' });
  });
  test('editing an override starts from it', () => {
    expect(
      overrideDefaults(line({ amount: 1200, overrideAmount: 1200, overrideReason: 'Own groom' })),
    ).toEqual({ amount: '1200.00', reason: 'Own groom' });
  });
});

describe('statusActions', () => {
  const v = (versionNo: number, status: string) => ({
    versionNo,
    status: status as never,
    issuedAt: null,
    validUntil: null,
    total: null,
    supersededReason: null,
  });
  test('the latest issued version can be revised', () => {
    expect(statusActions({ versionNo: 1, status: 'ISSUED', versions: [v(1, 'ISSUED')] })).toEqual({
      latest: true,
      draftVersionNo: null,
      canRevise: true,
    });
  });
  test('with a revision drafted, the issued version offers the draft', () => {
    expect(
      statusActions({ versionNo: 1, status: 'ISSUED', versions: [v(2, 'DRAFT'), v(1, 'ISSUED')] }),
    ).toEqual({ latest: true, draftVersionNo: 2, canRevise: false });
  });
  test('a superseded version is not the latest', () => {
    expect(
      statusActions({
        versionNo: 1,
        status: 'SUPERSEDED',
        versions: [v(2, 'ISSUED'), v(1, 'SUPERSEDED')],
      }).latest,
    ).toBe(false);
  });
  test('an accepted or declined quotation is not revised', () => {
    expect(
      statusActions({ versionNo: 1, status: 'ACCEPTED', versions: [v(1, 'ACCEPTED')] }).canRevise,
    ).toBe(false);
  });
  test('an expired version can be revised', () => {
    expect(
      statusActions({ versionNo: 1, status: 'EXPIRED', versions: [v(1, 'EXPIRED')] }).canRevise,
    ).toBe(true);
  });
});

describe('declinedBefore', () => {
  const version = (versionNo: number, status: QuotationVersion['status']): QuotationVersion => ({
    versionNo,
    status,
    issuedAt: '2026-10-20T04:00:00Z',
    validUntil: '2026-10-27T16:59:59.999Z',
    total: 8756.73,
    supersededReason: null,
    declinedAt: status === 'DECLINED' ? '2026-10-24T03:00:00Z' : null,
    declineReason: status === 'DECLINED' ? 'Too dear' : null,
  });

  test('the version a draft came from, when the customer declined it', () => {
    const v1 = version(1, 'DECLINED');
    expect(declinedBefore([version(2, 'DRAFT'), v1], 2)).toBe(v1);
  });

  test('nothing when that version only expired, or for the first version', () => {
    expect(declinedBefore([version(2, 'DRAFT'), version(1, 'EXPIRED')], 2)).toBeNull();
    expect(declinedBefore([version(1, 'DRAFT')], 1)).toBeNull();
  });
});

describe('declinedTitle', () => {
  const declined = (reason: string | null) => ({
    versionNo: 1,
    declinedAt: '2026-10-24T03:00:00Z',
    declineReason: reason,
  });

  test('the date, the reason and the closed request (spec §5.1)', () => {
    expect(declinedTitle(declined('Too dear'), 'REQ-2026-0202')).toBe(
      'The customer declined version 1 on 24 Oct 2026: Too dear. REQ-2026-0202 is closed.',
    );
  });

  test('a reason that ends its own sentence is not doubled', () => {
    expect(declinedTitle(declined('Too dear.'), 'REQ-2026-0202')).toBe(
      'The customer declined version 1 on 24 Oct 2026: Too dear. REQ-2026-0202 is closed.',
    );
  });

  test('without a reason', () => {
    expect(declinedTitle(declined(null), 'REQ-2026-0202')).toBe(
      'The customer declined version 1 on 24 Oct 2026. REQ-2026-0202 is closed.',
    );
  });
});
