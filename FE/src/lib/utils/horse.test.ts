import { describe, expect, test } from 'bun:test';

import {
  ageOf,
  coatOf,
  formatDay,
  formatHeight,
  formatMicrochip,
  formatSize,
  formatValue,
  formatWeight,
  heightProblem,
  pronouns,
  sizeClassFor,
  stallChip,
  temperamentChip,
} from './horse';

import type { SizeClass } from '@/interfaces';

const BANDS: SizeClass[] = [
  { code: 'S', widthIn: 32, minHeightHh: 10.0 },
  { code: 'M', widthIn: 32, minHeightHh: 14.3 },
  { code: 'L', widthIn: 48, minHeightHh: 16.3 },
  { code: 'XL', widthIn: 96, minHeightHh: 17.3 },
];

describe('size class (H-03)', () => {
  test('sizeClassForFollowsTheBands', () => {
    expect(sizeClassFor(14.2, 'STANDARD', BANDS)?.code).toBe('S');
    expect(sizeClassFor(14.3, 'STANDARD', BANDS)?.code).toBe('M');
    expect(sizeClassFor(16.2, 'STANDARD', BANDS)?.code).toBe('M');
    expect(sizeClassFor(16.3, 'STANDARD', BANDS)?.code).toBe('L');
    expect(sizeClassFor(17.3, 'STANDARD', BANDS)?.code).toBe('XL');
  });

  test('aBoxStallRaisesToAtLeastL', () => {
    expect(sizeClassFor(15.3, 'BOX', BANDS)?.code).toBe('L');
    expect(sizeClassFor(17.3, 'BOX', BANDS)?.code).toBe('XL');
  });

  test('invalidHeightsGiveNoClass', () => {
    expect(sizeClassFor(16.4, 'STANDARD', BANDS)).toBeNull();
    expect(sizeClassFor(9.9, 'STANDARD', BANDS)).toBeNull();
    expect(sizeClassFor(19.4, 'STANDARD', BANDS)).toBeNull();
    expect(sizeClassFor(null, 'STANDARD', BANDS)).toBeNull();
  });
});

describe('height', () => {
  test('heightProblemNamesTheNeighbours', () => {
    expect(heightProblem(16.4)).toBe(
      "16.4 hh isn't a height: a hand is 4 inches, so 16.3 hh is followed by 17.0 hh.",
    );
    expect(heightProblem(9.9)).toBe('Heights run from 10.0 to 19.3 hh.');
    expect(heightProblem(16.2)).toBeNull();
  });

  test('wholeAndTrailingZeroHeightsAreValid', () => {
    expect(heightProblem(16)).toBeNull();
    expect(heightProblem(16.2)).toBeNull();
    expect(formatHeight(16)).toBe('16.0 hh');
  });
});

describe('formats', () => {
  test('ageCountsWholeYears', () => {
    expect(ageOf('2019-05-10', '2026-10-17')).toBe('7 y');
    expect(ageOf('2019-05-10', '2026-05-09')).toBe('6 y');
    expect(ageOf(null, '2026-10-17')).toBe('—');
  });

  test('aCalendarDayIsFormattedWithoutTimeZoneShift', () => {
    expect(formatDay('2022-04-14')).toBe('14 Apr 2022');
    expect(formatDay(null)).toBe('—');
  });

  test('formatsReadLikeTheFrames', () => {
    expect(formatMicrochip('250259600123456')).toBe('250 259 600 123 456');
    expect(formatWeight(510)).toBe('510 kg');
    expect(formatSize({ code: 'M', widthIn: 32 })).toBe('M · 32');
    expect(formatValue(85000)).toBe('$85,000');
    expect(formatWeight(null)).toBe('—');
  });
});

describe('words and tones', () => {
  test('pronounsFollowTheSex', () => {
    expect(pronouns('MARE')).toEqual({ subject: 'she', object: 'her', possessive: 'her' });
    expect(pronouns('FILLY')).toEqual({ subject: 'she', object: 'her', possessive: 'her' });
    expect(pronouns('GELDING')).toEqual({ subject: 'he', object: 'him', possessive: 'his' });
    expect(pronouns(null)).toEqual({
      subject: 'the horse',
      object: 'the horse',
      possessive: "the horse's",
    });
  });

  test('otherOrNoCoatIsNeutral', () => {
    expect(coatOf('OTHER')).toBe('other');
    expect(coatOf(null)).toBe('other');
    expect(coatOf('BAY')).toBe('bay');
  });

  test('chipsCarryTheFrameTones', () => {
    expect(temperamentChip('CALM')).toEqual({ label: 'Calm', tone: 'ok' });
    expect(temperamentChip('NERVOUS')).toEqual({ label: 'Nervous', tone: 'warn' });
    expect(temperamentChip('AGGRESSIVE')).toEqual({ label: 'Aggressive', tone: 'bad' });
    expect(stallChip('CLIMATE')).toEqual({ label: 'Climate stall', tone: 'info' });
    expect(stallChip('BOX')).toEqual({ label: 'Box stall', tone: 'neutral' });
    expect(stallChip('STANDARD')).toBeNull();
  });
});
