import { describe, expect, test } from 'bun:test';

import { fromHorse, type HorseFormValues, makeHorseSchema, toHorseInput } from './schema';

import type { Horse } from '@/interfaces';

const TODAY = '2026-10-17';
const schema = makeHorseSchema(TODAY);

const NIGHTFALL: HorseFormValues = {
  name: 'Nightfall',
  microchip: '250259600223311',
  passportNo: 'VN-PP-2022-0188',
  sex: 'MARE',
  breed: 'Thoroughbred',
  dateOfBirth: '2022-04-14',
  coat: 'BLACK',
  heightHh: 16.0,
  weightKg: 478,
  temperament: 'NERVOUS',
  requiredStall: 'CLIMATE',
  handlingNotes: 'Sensitive to loud noise.',
  declaredValue: 240000,
};

/** The first message on a field, or undefined when it passes. */
const messageOn = (values: Partial<HorseFormValues>, field: keyof HorseFormValues) => {
  const result = schema.safeParse({ ...NIGHTFALL, ...values });
  return result.success ? undefined : result.error.issues.find((i) => i.path[0] === field)?.message;
};

describe('horseSchema', () => {
  test('nightfallPasses', () => {
    expect(schema.safeParse(NIGHTFALL).success).toBe(true);
  });

  test('eachRuleRefusesWithItsMessage', () => {
    expect(messageOn({ name: '  ' }, 'name')).toBe("Enter the horse's name.");
    expect(messageOn({ sex: undefined }, 'sex')).toBe("Choose the horse's sex.");
    expect(messageOn({ microchip: '2502596001234' }, 'microchip')).toBe(
      'A microchip has 15 digits; 13 were entered.',
    );
    expect(messageOn({ passportNo: '' }, 'passportNo')).toBe('Enter the passport number.');
    expect(messageOn({ heightHh: 16.4 }, 'heightHh')).toBe(
      "16.4 hh isn't a height: a hand is 4 inches, so 16.3 hh is followed by 17.0 hh.",
    );
    expect(messageOn({ heightHh: 9.9 }, 'heightHh')).toBe('Heights run from 10.0 to 19.3 hh.');
    expect(messageOn({ weightKg: 99 }, 'weightKg')).toBe('Weight runs from 100 to 1,500 kg.');
    expect(messageOn({ dateOfBirth: '2026-10-18' }, 'dateOfBirth')).toBe(
      'The date of birth 18 Oct 2026 is after today.',
    );
    expect(messageOn({ declaredValue: 0 }, 'declaredValue')).toBe(
      'Enter a declared value above $0.',
    );
    expect(messageOn({ declaredValue: 1.005 }, 'declaredValue')).toBe(
      'A declared value has at most 2 decimals.',
    );
  });

  test('aMicrochipWithLettersOrSymbolsSaysSo', () => {
    expect(messageOn({ microchip: '25025960012345O' }, 'microchip')).toBe(
      'A microchip is digits only; 25025960012345O has letters or symbols.',
    );
    expect(messageOn({ microchip: '250-259-600-123-456' }, 'microchip')).toBe(
      'A microchip is digits only; 250-259-600-123-456 has letters or symbols.',
    );
  });

  test('aLockedHorseSkipsTheIdentityRules', () => {
    const locked = makeHorseSchema(TODAY, { locked: true });
    expect(
      locked.safeParse({ ...NIGHTFALL, name: '', microchip: '', sex: undefined, dateOfBirth: null })
        .success,
    ).toBe(true);
  });

  test('schemaAcceptsWholeAndTrailingZeroHeights', () => {
    expect(messageOn({ heightHh: 16 }, 'heightHh')).toBeUndefined();
    expect(messageOn({ heightHh: Number('16.20') }, 'heightHh')).toBeUndefined();
  });

  test('microchipSpacesPassAndAreStripped', () => {
    expect(messageOn({ microchip: '250 259 600 223 311' }, 'microchip')).toBeUndefined();
    expect(toHorseInput({ ...NIGHTFALL, microchip: '250 259 600 223 311' }).microchip).toBe(
      '250259600223311',
    );
  });

  test('dateOfBirthTodayPasses', () => {
    expect(messageOn({ dateOfBirth: TODAY }, 'dateOfBirth')).toBeUndefined();
  });

  test('aLockedHorseRoundTripsItsIdentity', () => {
    const nightfall: Horse = {
      id: '01a1459d-4eb4-7c74-b0cd-667684017a6c',
      createdAt: '2026-10-16T00:00:00Z',
      updatedAt: '2026-10-16T00:00:00Z',
      name: 'Nightfall',
      coat: 'BLACK',
      breed: 'Thoroughbred',
      sex: 'MARE',
      dateOfBirth: '2022-04-14',
      heightHh: 16.0,
      weightKg: 478,
      sizeClass: { code: 'M', widthIn: 32 },
      microchip: '250259600223311',
      passportNo: 'VN-PP-2022-0188',
      declaredValue: 240000,
      valueCurrency: 'USD',
      temperament: 'NERVOUS',
      requiredStall: 'CLIMATE',
      handlingNotes: null,
      archivedAt: null,
      identityLocked: true,
    };
    const input = toHorseInput(fromHorse(nightfall));
    expect([
      input.name,
      input.microchip,
      input.sex,
      input.breed,
      input.dateOfBirth,
      input.coat,
    ]).toEqual([
      nightfall.name,
      nightfall.microchip,
      nightfall.sex,
      nightfall.breed,
      nightfall.dateOfBirth,
      nightfall.coat,
    ]);
  });

  test('blanksBecomeNull', () => {
    const input = toHorseInput({ ...NIGHTFALL, breed: '  ', handlingNotes: '' });
    expect(input.breed).toBeNull();
    expect(input.handlingNotes).toBeNull();
  });
});
