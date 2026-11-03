import { describe, expect, test } from 'bun:test';

import { apiErrorCode, apiErrorView, formRefusal, noTripYet } from './error';

const FALLBACK = 'Something went wrong. Try again.';
const refused = (status: number, data: object) => ({ response: { status, data } });

describe('apiErrorView', () => {
  test('validationDetailsMapToFields', () => {
    const view = apiErrorView(
      refused(400, {
        error: 'Validation Failed',
        message: 'Invalid request payload',
        details: ['heightHh: must not be null', 'name: size must be between 1 and 80'],
      }),
      {},
      FALLBACK,
    );
    expect(view.fields).toEqual({
      heightHh: 'must not be null',
      name: 'size must be between 1 and 80',
    });
    expect(view.form).toBeNull();
  });

  test('aKnownCodeLandsOnItsField', () => {
    const message = 'Saigon Turf Club already has an active horse named Nightfall.';
    const view = apiErrorView(
      refused(409, { error: 'HORSE_NAME_TAKEN', message }),
      { HORSE_NAME_TAKEN: 'name' },
      FALLBACK,
    );
    expect(view.fields).toEqual({ name: message });
    expect(view.form).toBeNull();
  });

  test('anUnknownCodeGoesToTheForm', () => {
    const message = 'Nightfall is on REQ-2026-0193, which is in review. Archive her after it ends.';
    const view = apiErrorView(
      refused(409, { error: 'HORSE_IN_USE', message }),
      { HORSE_NAME_TAKEN: 'name' },
      FALLBACK,
    );
    expect(view.fields).toEqual({});
    expect(view.form).toBe(message);
  });

  test('noApiErrorBodyGivesTheFallback', () => {
    const view = apiErrorView(new Error('Network Error'), {}, FALLBACK);
    expect(view).toEqual({ fields: {}, form: FALLBACK });
  });
});

describe('formRefusal', () => {
  test('theFirstShownFieldIsFocused', () => {
    expect(
      formRefusal({ fields: { name: 'Taken.', microchip: 'Registered.' }, form: null }, [
        'name',
        'microchip',
      ]),
    ).toEqual({ fields: { name: 'Taken.', microchip: 'Registered.' }, form: null, focus: 'name' });
  });

  test('aFieldTheFormDoesNotShowGoesToTheFormMessage', () => {
    expect(
      formRefusal(
        { fields: { microchip: 'must not be blank', weightKg: 'Too heavy.' }, form: null },
        ['weightKg'],
      ),
    ).toEqual({
      fields: { weightKg: 'Too heavy.' },
      form: 'microchip: must not be blank',
      focus: 'weightKg',
    });
  });

  test('aFormMessageHasNoFocus', () => {
    expect(formRefusal({ fields: {}, form: 'In use.' }, ['name'])).toEqual({
      fields: {},
      form: 'In use.',
      focus: null,
    });
  });
});

describe('apiErrorCode', () => {
  test('the code a refusal carries', () => {
    const changed = refused(409, {
      error: 'QUOTATION_VERSION_CHANGED',
      message: 'Version 1 was replaced by version 2. Read it before you answer.',
    });
    expect(apiErrorCode(changed)).toBe('QUOTATION_VERSION_CHANGED');
  });

  test('nothing without an ApiError body', () => {
    expect(apiErrorCode(new Error('Network Error'))).toBeNull();
    expect(apiErrorCode(undefined)).toBeNull();
  });
});

describe('noTripYet', () => {
  test('a job approved before its first trip answers NO_TRIP, which is no failure', () => {
    expect(
      noTripYet(refused(400, { error: 'NO_TRIP', message: 'This job has no trip yet.' })),
    ).toBe(true);
  });

  test('any other refusal or a dropped connection is a failure', () => {
    expect(noTripYet(refused(400, { error: 'TRIP_NOT_FOUND', message: 'No such trip.' }))).toBe(
      false,
    );
    expect(noTripYet(refused(500, {}))).toBe(false);
    expect(noTripYet(new Error('Network Error'))).toBe(false);
  });
});
