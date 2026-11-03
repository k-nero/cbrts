import { describe, expect, test } from 'bun:test';

import { canSignOffTripPlan } from './rbac';

describe('canSignOffTripPlan', () => {
  test('logisticsManagerSignsOff', () => {
    expect(canSignOffTripPlan(['LOGISTICS_MANAGER'])).toBe(true);
  });

  test('coordinatorDoesNot', () => {
    expect(canSignOffTripPlan(['FLEET_COORDINATOR'])).toBe(false);
  });

  test('otherStaffDoNot', () => {
    expect(canSignOffTripPlan(['TRANSPORT_SPECIALIST'])).toBe(false);
    expect(canSignOffTripPlan([])).toBe(false);
  });
});
