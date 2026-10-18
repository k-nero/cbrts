import { describe, expect, test } from 'bun:test';

import {
  bandLabel,
  bandRefusal,
  basisWords,
  corridorShort,
  draftRefusal,
  pctText,
  policyRows,
} from './rates';

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

describe('corridorShort', () => {
  test('drops the mode prefix', () => {
    expect(corridorShort('AIR PNH → HKG')).toBe('PNH → HKG');
    expect(corridorShort('RD HAN → VTE')).toBe('HAN → VTE');
    expect(corridorShort('HCM -> PNH')).toBe('HCM -> PNH');
  });
});

describe('policyRows', () => {
  test('the policy panel in words, fee bands read-only', () => {
    const rows = policyRows(
      {
        FUEL_PCT: 18,
        INSURANCE_PCT: 1.5,
        CONTINGENCY_PCT: 5,
        SERVICE_FEE_PCT: 12,
        DEPOSIT_PCT: 30,
        QUOTE_VALIDITY_DAYS: 7,
        FLIGHT_VET_MIN_HORSES: 8,
        HIGH_VALUE_THRESHOLD: 250000,
        ARRIVAL_WINDOW_PCT: 20,
        ARRIVAL_WINDOW_MIN_HOURS: 3,
        LATE_PENALTY_PCT_PER_HOUR: 10,
        LATE_PENALTY_CAP_PCT: 30,
      },
      [
        { kind: 'CANCELLATION', minDays: 0, maxDays: 6, value: 100 },
        { kind: 'CANCELLATION', minDays: 30, maxDays: null, value: 10 },
        { kind: 'SHORT_NOTICE', minDays: 0, maxDays: 13, value: 1.25 },
      ],
    );
    expect(rows).toEqual([
      { key: 'FUEL_PCT', label: 'Fuel surcharge', value: '18% · air lines only' },
      { key: 'INSURANCE_PCT', label: 'Insurance', value: '1.5% of declared value' },
      { key: 'CONTINGENCY_PCT', label: 'Contingency', value: '5% of cost base' },
      { key: 'SERVICE_FEE_PCT', label: 'Service fee', value: '12% after contingency' },
      { key: 'DEPOSIT_PCT', label: 'Deposit', value: '30%' },
      { key: 'QUOTE_VALIDITY_DAYS', label: 'Quote validity', value: '7 days' },
      { key: 'FLIGHT_VET_MIN_HORSES', label: 'Flight vet', value: '8+ horses or > $250,000.00' },
      { key: 'SHORT_NOTICE', label: 'Short notice', value: '0–13 d × 1.25' },
      { key: 'CANCELLATION', label: 'Cancellation', value: '0–6 d 100% · 30+ d 10%' },
      {
        key: 'ARRIVAL_WINDOW_PCT',
        label: 'Arrival window',
        value: 'Road · +20% of ground lines · 3 h minimum',
      },
      {
        key: 'LATE_PENALTY_PCT_PER_HOUR',
        label: 'Late arrival',
        value: '10% per started hour · max 30%',
      },
    ]);
  });

  test('a missing value is a dash', () => {
    expect(policyRows({}, [])[0]).toEqual({ key: 'FUEL_PCT', label: 'Fuel surcharge', value: '—' });
  });
});
