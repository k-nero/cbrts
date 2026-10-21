import { describe, expect, test } from 'bun:test';

import { horseCardProps, type HorseCardSource } from './horseCardProps';

const TODAY = '2026-10-17';

const SHADOWFAX: HorseCardSource = {
  name: 'Shadowfax',
  coat: 'GREY',
  breed: 'Andalusian',
  sex: 'GELDING',
  dateOfBirth: '2019-05-10',
  heightHh: 16.2,
  weightKg: 510,
  sizeClass: { code: 'M', widthIn: 32 },
  microchip: '250259600123456',
  declaredValue: 85000,
  valueCurrency: 'USD',
  temperament: 'CALM',
  requiredStall: 'STANDARD',
  handlingNotes: 'Loads best in a quiet yard.',
};

describe('horseCardProps', () => {
  test('mapsTheFramesShadowfax', () => {
    const props = horseCardProps(SHADOWFAX, TODAY);
    expect(props.coat).toBe('grey');
    expect(props.name).toBe('Shadowfax');
    expect(props.subtitle).toBe('Andalusian · Gelding');
    expect(props.facts).toEqual({
      age: '7 y',
      height: '16.2 hh',
      weight: '510 kg',
      size: 'M · 32',
    });
    expect(props.microchip).toBe('250 259 600 123 456');
    expect(props.declaredValue).toBe('$85,000');
    expect(props.notes).toBe('Loads best in a quiet yard.');
  });

  test('noBreedShowsTheSexAlone', () => {
    expect(horseCardProps({ ...SHADOWFAX, breed: null, sex: 'MARE' }, TODAY).subtitle).toBe('Mare');
  });

  test('aPreviewWithNothingTypedShowsDashes', () => {
    const props = horseCardProps(
      {
        name: '',
        coat: null,
        breed: null,
        sex: null,
        dateOfBirth: null,
        heightHh: null,
        weightKg: null,
        sizeClass: null,
        microchip: null,
        declaredValue: null,
        valueCurrency: 'USD',
        temperament: null,
        requiredStall: 'STANDARD',
        handlingNotes: null,
      },
      TODAY,
    );
    expect(props.coat).toBe('other');
    expect(props.name).toBe('—');
    expect(props.facts).toEqual({ age: '—', height: '—', weight: '—', size: '—' });
    expect(props.microchip).toBe('—');
    expect(props.declaredValue).toBe('—');
  });
});
