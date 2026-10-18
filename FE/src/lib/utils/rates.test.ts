import { describe, expect, test } from 'bun:test';

import { bandLabel, bandRefusal, basisWords, draftRefusal, pctText } from './rates';

import type { RateLine, VolumeBreakInput } from '@/interfaces';

const line = (over: Partial<RateLine>): RateLine => ({
  id: 'l1',
  code: 'X',
  group: 'B',
  description: 'A line',
  basis: 'PER_HORSE',
  appliesToSex: null,
  appliesToTrailer: null,
  rate: 100,
  minCharge: null,
  defaultQuantity: null,
  certainty: 'FIXED',
  estimateNote: null,
  everyCorridor: true,
  ...over,
});

describe('basisWords', () => {
  const policies = { FLIGHT_VET_MIN_HORSES: 8, HIGH_VALUE_THRESHOLD: 250000 };

  test('per day for one sex', () => {
    expect(basisWords(line({ basis: 'PER_DAY', appliesToSex: 'STALLION' }), policies)).toBe(
      'per day · stallion',
    );
  });

  test('grooms are one per three horses', () => {
    expect(basisWords(line({ basis: 'PER_THREE_HORSES' }), policies)).toBe('1 per 3 horses');
  });

  test('the flight vet names its thresholds', () => {
    expect(basisWords(line({ basis: 'FLIGHT_VET' }), policies)).toBe('8+ horses or > $250,000.00');
  });

  test('a road rate names its trailer and minimum', () => {
    expect(
      basisWords(line({ basis: 'PER_KM', appliesToTrailer: 'PRIVATE', minCharge: 400 }), policies),
    ).toBe('per km · private trailer · min $400.00');
  });

  test('per hour names the hours it assumes', () => {
    expect(basisWords(line({ basis: 'PER_HOUR', defaultQuantity: 2 }), policies)).toBe(
      'per hour · 2 h',
    );
  });

  test('plain bases', () => {
    expect(basisWords(line({ basis: 'PER_SHIPMENT' }), policies)).toBe('per shipment');
    expect(basisWords(line({ basis: 'PER_CROSSING' }), policies)).toBe('per crossing');
    expect(basisWords(line({ basis: 'PER_HORSE' }), policies)).toBe('per horse');
  });
});

describe('bandRefusal', () => {
  const band = (
    minHorses: number | null,
    maxHorses: number | null,
    discountPct: number | null = 0,
  ): VolumeBreakInput => ({
    minHorses,
    maxHorses,
    discountPct,
  });

  test('the server sentences, in its order', () => {
    expect(bandRefusal([])).toBe('The first band must start at 1 horse.');
    expect(bandRefusal([band(2, null)])).toBe('The first band must start at 1 horse.');
    expect(bandRefusal([band(1, 1), band(3, null, 5)])).toBe(
      'The bands must follow on without gaps: 1 is followed by 3+.',
    );
    expect(bandRefusal([band(1, 3), band(3, null, 5)])).toBe('The bands overlap at 3 horses.');
    expect(bandRefusal([band(1, 1), band(2, 7, 5)])).toBe('The last band must be open-ended (2+).');
    expect(bandRefusal([band(1, null, 101)])).toBe('A discount must be between 0 and 100%.');
    expect(bandRefusal([band(1, 1), band(4, 2, 5), band(5, null, 5)])).toBe(
      "A band can't end before it starts: 4–2.",
    );
    expect(bandRefusal([band(null, null)])).toBe('Each band needs the horse count it starts at.');
  });

  test('a valid list passes', () => {
    expect(bandRefusal([band(1, 1), band(2, 3, 5), band(4, 7, 10), band(8, null, 15)])).toBeNull();
  });
});

describe('bandLabel', () => {
  test('single, range and open bands', () => {
    expect(bandLabel({ minHorses: 1, maxHorses: 1, discountPct: 0 })).toBe('1');
    expect(bandLabel({ minHorses: 2, maxHorses: 3, discountPct: 5 })).toBe('2–3');
    expect(bandLabel({ minHorses: 8, maxHorses: null, discountPct: 15 })).toBe('8+');
  });
});

describe('pctText', () => {
  test('no trailing zeros', () => {
    expect(pctText(18)).toBe('18%');
    expect(pctText(1.5)).toBe('1.5%');
  });
});

describe('draftRefusal', () => {
  test('a 409 NO_DRAFT means the draft is gone', () => {
    const error = {
      response: { status: 409, data: { error: 'NO_DRAFT', message: 'There is no draft.' } },
    };
    expect(draftRefusal(error)).toBe('no-draft');
  });

  test('anything else is not', () => {
    expect(
      draftRefusal({ response: { status: 400, data: { error: 'INVALID_VOLUME_BREAKS' } } }),
    ).toBeNull();
    expect(draftRefusal(new Error('offline'))).toBeNull();
  });
});
