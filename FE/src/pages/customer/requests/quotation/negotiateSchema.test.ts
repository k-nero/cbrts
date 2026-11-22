import { describe, expect, test } from 'bun:test';

import { makeNegotiateSchema, type NegotiateValues, toCounterOfferBody } from './negotiateSchema';

const LINES = [
  { lineKey: 'ROAD_SHARED', amount: 400, negotiable: true },
  { lineKey: 'GROOM', amount: 480, negotiable: true },
  { lineKey: 'VET_BLOODS', amount: 620, negotiable: false },
];

const schema = makeNegotiateSchema(LINES);

const values = (asks: NegotiateValues['asks'], message = ''): NegotiateValues => ({
  message,
  asks,
});

const messages = (v: NegotiateValues) => {
  const r = schema.safeParse(v);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe('negotiateSchema', () => {
  test('nothingTickedIsRefused', () => {
    expect(messages(values({}))).toEqual(["Tick at least one line you'd like cheaper."]);
    expect(messages(values({ GROOM: { ticked: false, price: 400, reason: 'x' } }))).toEqual([
      "Tick at least one line you'd like cheaper.",
    ]);
  });

  test('aPriceAtOrAboveTheAmountIsRefused', () => {
    expect(
      messages(values({ ROAD_SHARED: { ticked: true, price: 400, reason: 'Cheaper elsewhere' } })),
    ).toEqual(['Ask for less than $400.00.']);
    expect(
      messages(values({ ROAD_SHARED: { ticked: true, price: 0, reason: 'We bring our own' } })),
    ).toEqual([]);
  });

  test('aTickedLineNeedsAPriceAndAReason', () => {
    expect(messages(values({ GROOM: { ticked: true, reason: 'Too dear' } }))).toEqual([
      'Enter the price you would pay.',
    ]);
    expect(messages(values({ GROOM: { ticked: true, price: 400, reason: '  ' } }))).toEqual([
      'Say why, for the logistics manager.',
    ]);
  });

  test('toCounterOfferBodySendsOnlyTheTickedLines', () => {
    const body = toCounterOfferBody(
      values(
        {
          ROAD_SHARED: { ticked: true, price: 300, reason: ' Another carrier quoted $300 ' },
          GROOM: { ticked: false, price: 400, reason: 'never sent' },
        },
        '  Regular customer  ',
      ),
      2,
    );
    expect(body).toEqual({
      versionNo: 2,
      message: 'Regular customer',
      lines: [{ lineKey: 'ROAD_SHARED', askedAmount: 300, reason: 'Another carrier quoted $300' }],
    });
    expect(
      toCounterOfferBody(values({ GROOM: { ticked: true, price: 1, reason: 'x' } }), 1).message,
    ).toBeNull();
  });
});
