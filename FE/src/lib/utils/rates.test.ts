import { describe, expect, test } from 'bun:test';

import {
  bandLabel,
  bandRefusal,
  bandsSave,
  basisWords,
  corridorShort,
  draftRefusal,
  editorRefusal,
  lineScopeWarning,
  pctText,
  pickCorridor,
  policyRows,
  ratesReading,
  rowActionLabels,
} from './rates';

import type { RateCorridor, RateLine, VolumeBreakInput } from '@/interfaces';

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

  test('a 404 means the row or draft was replaced since the page loaded', () => {
    const error = {
      response: { status: 404, data: { error: 'Not Found', message: 'Rate line not found.' } },
    };
    expect(draftRefusal(error)).toBe('stale');
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
        ESTIMATE_BAND_PCT: 15,
        FLIGHT_VET_MIN_HORSES: 8,
        HIGH_VALUE_THRESHOLD: 250000,
        ARRIVAL_WINDOW_PCT: 20,
        ARRIVAL_WINDOW_MIN_HOURS: 3,
        LATE_PENALTY_PCT_PER_HOUR: 10,
        LATE_PENALTY_CAP_PCT: 30,
        STALL_PAYLOAD_KG: 5504,
        AIR_SHIPMENT_MAX_KG: 20000,
        TURNAROUND_HOURS: 24,
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
      { key: 'ESTIMATE_BAND_PCT', label: 'Estimate band', value: '± 15% minimum' },
      { key: 'FLIGHT_VET_MIN_HORSES', label: 'Flight vet', value: '8+ horses or > $250,000.00' },
      { key: 'STALL_PAYLOAD_KG', label: 'Stall payload', value: '5,504 kg per stall' },
      { key: 'AIR_SHIPMENT_MAX_KG', label: 'Air shipment', value: '20,000 kg of horses' },
      { key: 'TURNAROUND_HOURS', label: 'Turnaround', value: '24 h after each trip' },
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
    expect(policyRows({}, []).find((r) => r.key === 'ESTIMATE_BAND_PCT')?.value).toBe('—');
    expect(policyRows({}, []).find((r) => r.key === 'STALL_PAYLOAD_KG')?.value).toBe('—');
    expect(policyRows({}, []).find((r) => r.key === 'AIR_SHIPMENT_MAX_KG')?.value).toBe('—');
    expect(policyRows({}, []).find((r) => r.key === 'TURNAROUND_HOURS')?.value).toBe('—');
  });
});

describe('bandsSave', () => {
  const bands = [{ minHorses: 1, maxHorses: null, discountPct: 3 }];

  test("unticking a corridor's own bands removes them and leaves the shared bands alone", () => {
    expect(bandsSave('CORRIDOR', false, bands)).toEqual({ corridorScoped: true, bands: [] });
  });

  test('own bands are saved to the corridor', () => {
    expect(bandsSave('CORRIDOR', true, bands)).toEqual({ corridorScoped: true, bands });
    expect(bandsSave('GLOBAL', true, bands)).toEqual({ corridorScoped: true, bands });
  });

  test('the shared bands are saved for every corridor', () => {
    expect(bandsSave('GLOBAL', false, bands)).toEqual({ corridorScoped: false, bands });
  });
});

describe('editorRefusal', () => {
  const validation = {
    response: {
      status: 400,
      data: {
        error: 'Validation Failed',
        message: 'Validation failed',
        details: ['rate: Use at most 2 decimals.', 'corridorId: must not be null'],
      },
    },
  };

  test('a shown field keeps its message and a hidden one joins the form message', () => {
    expect(editorRefusal(validation, {}, ['rate', 'code'])).toEqual({
      fields: { rate: 'Use at most 2 decimals.' },
      form: 'corridorId: must not be null',
      focus: 'rate',
    });
  });

  test('a coded refusal goes to its field', () => {
    const error = {
      response: {
        status: 400,
        data: {
          error: 'DESCRIPTION',
          message: 'A line for one sex can have at most 149 characters.',
        },
      },
    };
    expect(editorRefusal(error, { DESCRIPTION: 'description' }, ['description'])).toEqual({
      fields: { description: 'A line for one sex can have at most 149 characters.' },
      form: null,
      focus: 'description',
    });
  });

  test('no answer at all is a form message', () => {
    expect(editorRefusal(new Error('offline'), {}, ['rate']).form).toBe(
      "Couldn't save. Check your connection and try again.",
    );
  });
});

describe('lineScopeWarning', () => {
  const every = line({ everyCorridor: true });
  const own = line({ everyCorridor: false });

  test('unticking every corridor on an every-corridor line warns that the others lose it', () => {
    expect(lineScopeWarning(every, false, 'RD HAN → VTE')).toBe(
      'Saving adds a line for HAN → VTE that replaces this one here; every other corridor keeps it.',
    );
  });

  test('ticking every corridor on a corridor line warns that every corridor gets it', () => {
    expect(lineScopeWarning(own, true, 'RD HAN → VTE')).toBe(
      'Saving makes this line apply to every corridor, not only HAN → VTE.',
    );
  });

  test('no change of scope, or a new line, has no warning', () => {
    expect(lineScopeWarning(every, true, 'RD HAN → VTE')).toBeNull();
    expect(lineScopeWarning(own, false, 'RD HAN → VTE')).toBeNull();
    expect(lineScopeWarning(null, false, 'RD HAN → VTE')).toBeNull();
  });
});

describe('pickCorridor', () => {
  const corridor = (id: string): RateCorridor => ({
    id,
    code: `RD ${id}`,
    mode: 'ROAD',
    fromCity: 'From',
    toCity: 'To',
    distanceKm: 100,
    crossingCount: 0,
    missingCount: 0,
  });
  const list = [corridor('a'), corridor('b')];

  test('the corridor in the address when it is in the catalog', () => {
    expect(pickCorridor(list, 'b')).toEqual({ id: 'b', unknown: false });
  });

  test('the first corridor when the address names none', () => {
    expect(pickCorridor(list, null)).toEqual({ id: 'a', unknown: false });
  });

  test('an unknown corridor in the address falls back to the first and says so', () => {
    expect(pickCorridor(list, 'gone')).toEqual({ id: 'a', unknown: true });
  });

  test('no corridors at all', () => {
    expect(pickCorridor([], null)).toEqual({ id: null, unknown: false });
    expect(pickCorridor([], 'gone')).toEqual({ id: null, unknown: true });
  });
});

describe('rowActionLabels', () => {
  test('edit and remove name the row', () => {
    expect(rowActionLabels('Flying groom')).toEqual({
      edit: 'Edit Flying groom',
      remove: 'Remove Flying groom',
    });
  });
});

describe('ratesReading', () => {
  const both = { currentVersionId: 'v4', draftVersionId: 'v5' };
  const published = { currentVersionId: 'v4', draftVersionId: null };

  test('the specialist reads the open draft, else the current version', () => {
    expect(ratesReading(both, true)).toEqual({ versionId: 'v5', hiddenDraft: false });
    expect(ratesReading(published, true)).toEqual({ versionId: 'v4', hiddenDraft: false });
  });

  test('a reader who cannot edit reads the current version and is told a draft is open', () => {
    expect(ratesReading(both, false)).toEqual({ versionId: 'v4', hiddenDraft: true });
    expect(ratesReading(published, false)).toEqual({ versionId: 'v4', hiddenDraft: false });
  });

  test('with nothing published, a reader who cannot edit has no version to read', () => {
    expect(ratesReading({ currentVersionId: null, draftVersionId: 'v1' }, false)).toEqual({
      versionId: null,
      hiddenDraft: true,
    });
  });
});
