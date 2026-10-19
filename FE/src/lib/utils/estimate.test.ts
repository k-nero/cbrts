import { describe, expect, test } from 'bun:test';

import { deltaText, estimateStub, exactText, optionMeta, rangeText } from './estimate';

import type { Estimate, OptionEffect } from '@/interfaces';

const effect = (over: Partial<OptionEffect>): OptionEffect => ({
  value: 'FIRST',
  current: false,
  deltaLow: null,
  deltaHigh: null,
  exact: null,
  unavailable: null,
  ...over,
});

const estimate = (over: Partial<Estimate>): Estimate => ({
  status: 'READY',
  low: 31900,
  high: 43300,
  message: null,
  assumptions: ['Assumes air until you choose a service on step 3.'],
  versionNo: 6,
  options: { mode: [], trailer: [], airClass: [], insurance: [], arrivalWindow: [] },
  ...over,
});

describe('rangeText', () => {
  test('whole dollars with grouping', () => {
    expect(rangeText(31900, 43300)).toBe('$31,900 – $43,300');
  });
});

describe('deltaText', () => {
  test('a dearer choice', () => {
    expect(deltaText(2400, 3300)).toBe('+ $2,400 – $3,300');
  });

  test('a cheaper choice, smaller figure first', () => {
    expect(deltaText(-1500, -1100)).toBe('− $1,100 – $1,500');
    expect(deltaText(-1200, -1600)).toBe('− $1,200 – $1,600');
  });

  test('no change', () => {
    expect(deltaText(0, 0)).toBe('± $0');
  });

  test('ends of different signs', () => {
    expect(deltaText(-200, 300)).toBe('− $200 – + $300');
  });
});

describe('exactText', () => {
  test('signed whole dollars', () => {
    expect(exactText(4875)).toBe('+ $4,875');
    expect(exactText(-4875)).toBe('− $4,875');
  });
});

describe('optionMeta', () => {
  test('a rule reason wins over everything', () => {
    expect(
      optionMeta(effect({ current: true }), 'Your arrival window needs a private trailer.'),
    ).toBe('Your arrival window needs a private trailer.');
  });

  test('the current choice is in the estimate', () => {
    expect(optionMeta(effect({ current: true }))).toBe('In the estimate');
  });

  test('an exact figure, then a delta, then the reason it cannot be priced', () => {
    expect(optionMeta(effect({ exact: -4875 }))).toBe('− $4,875');
    expect(optionMeta(effect({ deltaLow: 2400, deltaHigh: 3300 }))).toBe('+ $2,400 – $3,300');
    expect(optionMeta(effect({ unavailable: "We don't run this route by road." }))).toBe(
      "We don't run this route by road.",
    );
  });

  test('nothing to say', () => {
    expect(optionMeta(effect({}))).toBeUndefined();
    expect(optionMeta(undefined)).toBeUndefined();
  });
});

describe('estimateStub', () => {
  const base = { loading: false, error: false, stored: null, step: 'route' as const };

  test('a submitted request shows the range it was submitted with', () => {
    expect(
      estimateStub({ ...base, estimate: undefined, stored: { low: 31900, high: 43300 } }),
    ).toEqual({
      range: '$31,900 – $43,300',
      rangeSub: 'Your estimate when you submitted. Not a quote.',
    });
  });

  test('a range with the first assumption under it', () => {
    expect(estimateStub({ ...base, estimate: estimate({}) })).toEqual({
      range: '$31,900 – $43,300',
      rangeSub: 'Assumes air until you choose a service on step 3.',
    });
  });

  test('on Review the stub says it is not a quote', () => {
    expect(estimateStub({ ...base, step: 'review', estimate: estimate({}) }).rangeSub).toBe(
      'Not a quote. Once you approve the quotation, this becomes your travel pass.',
    );
  });

  test('no range: the server says why', () => {
    expect(
      estimateStub({
        ...base,
        estimate: estimate({
          status: 'NOT_READY',
          low: null,
          high: null,
          message: 'Choose the route and horses to see an estimate.',
          assumptions: [],
        }),
      }),
    ).toEqual({ range: null, rangeSub: 'Choose the route and horses to see an estimate.' });
  });

  test('loading with nothing to show yet', () => {
    expect(estimateStub({ ...base, estimate: undefined, loading: true })).toEqual({
      range: null,
      rangeSub: 'Working out your estimate…',
    });
  });

  test('an error says it will try again', () => {
    expect(estimateStub({ ...base, estimate: undefined, error: true })).toEqual({
      range: null,
      rangeSub: "The estimate didn't load. It will try again when you change something.",
    });
  });
});
