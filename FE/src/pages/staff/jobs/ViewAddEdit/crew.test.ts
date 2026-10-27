import { describe, expect, test } from 'bun:test';

import { groomsRequired, horsesForCrew } from './crew';

describe('horsesForCrew', () => {
  test('loneTrailerCountsPlacedHorses', () => {
    expect(horsesForCrew(4, false, 2)).toBe(4);
  });

  test('loneTrailerFallsBackToJobHorsesBeforePlacing', () => {
    expect(horsesForCrew(0, false, 2)).toBe(2);
  });

  test('convoyTrailerCountsOnlyItsOwnHorses', () => {
    expect(horsesForCrew(0, true, 5)).toBe(0);
    expect(horsesForCrew(3, true, 5)).toBe(3);
  });
});

describe('groomsRequired', () => {
  test('onePerThreeRoundedUp', () => {
    expect(groomsRequired(0)).toBe(0);
    expect(groomsRequired(1)).toBe(1);
    expect(groomsRequired(3)).toBe(1);
    expect(groomsRequired(4)).toBe(2);
  });
});
