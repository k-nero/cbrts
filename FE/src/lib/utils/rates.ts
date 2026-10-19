import { money } from './quotation';

import type {
  ApiError,
  FeeBand,
  RateLine,
  RatePolicyKey,
  VolumeBreak,
  VolumeBreakInput,
} from '@/interfaces';
import type { AxiosError } from 'axios';

const TRAILER_WORDS = { SHARED: 'shared load', PRIVATE: 'private trailer' } as const;

/** "18%", "1.5%". */
export const pctText = (value: number): string => `${Number(value.toFixed(3))}%`;

/** The basis of a catalog line in words, as the Rates table shows it. */
export const basisWords = (
  line: RateLine,
  policies: Partial<Record<RatePolicyKey, number>>,
): string => {
  const sex = line.appliesToSex ? ` · ${line.appliesToSex.toLowerCase()}` : '';
  switch (line.basis) {
    case 'PER_HORSE':
      return `per horse${sex}`;
    case 'PER_DAY':
      return `per day${sex}`;
    case 'PER_SHIPMENT':
      return 'per shipment';
    case 'PER_CROSSING':
      return 'per crossing';
    case 'PER_POSITION':
      return 'per position';
    case 'PER_HOUR':
      return `per hour · ${line.defaultQuantity ?? 0} h`;
    case 'PER_THREE_HORSES':
      return '1 per 3 horses';
    case 'FLIGHT_VET': {
      const horses = policies.FLIGHT_VET_MIN_HORSES;
      const value = policies.HIGH_VALUE_THRESHOLD;
      return `${horses ?? '?'}+ horses or > ${value == null ? '?' : money(value)}`;
    }
    case 'PER_KM': {
      const parts = ['per km'];
      if (line.appliesToTrailer) parts.push(TRAILER_WORDS[line.appliesToTrailer]);
      if (line.minCharge != null) parts.push(`min ${money(line.minCharge)}`);
      return parts.join(' · ');
    }
  }
};

/** "1", "2–3", "8+". */
export const bandLabel = (band: Pick<VolumeBreak, 'minHorses' | 'maxHorses'>): string => {
  if (band.maxHorses == null) return `${band.minHorses}+`;
  return band.maxHorses === band.minHorses
    ? `${band.minHorses}`
    : `${band.minHorses}–${band.maxHorses}`;
};

/**
 * Why a list of volume breaks would be refused, in the server's words and order, or null when it is valid:
 * the bands start at 1 horse, follow on without gaps or overlaps, and the last one is open-ended.
 */
export const bandRefusal = (bands: VolumeBreakInput[]): string | null => {
  if (bands.length === 0) return 'The first band must start at 1 horse.';
  for (const b of bands) {
    if (b.minHorses == null) return 'Each band needs the horse count it starts at.';
    if (b.discountPct == null || b.discountPct < 0 || b.discountPct > 100) {
      return 'A discount must be between 0 and 100%.';
    }
    if (b.maxHorses != null && b.maxHorses < b.minHorses) {
      return `A band can't end before it starts: ${b.minHorses}–${b.maxHorses}.`;
    }
  }
  const sorted = [...bands].sort(
    (a, b) => (a.minHorses ?? 0) - (b.minHorses ?? 0),
  ) as (VolumeBreakInput & {
    minHorses: number;
  })[];
  if (sorted[0].minHorses !== 1) return 'The first band must start at 1 horse.';
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1];
    const b = sorted[i];
    if (a.maxHorses == null || b.minHorses <= a.maxHorses)
      return `The bands overlap at ${b.minHorses} horses.`;
    if (b.minHorses > a.maxHorses + 1) {
      return `The bands must follow on without gaps: ${bandLabel(a)} is followed by ${bandLabel(b)}.`;
    }
  }
  const last = sorted[sorted.length - 1];
  if (last.maxHorses != null) return `The last band must be open-ended (${last.minHorses}+).`;
  return null;
};

/** 'no-draft' when a write found no draft (someone published or discarded it meanwhile). */
export const draftRefusal = (error: unknown): 'no-draft' | null => {
  const data = (error as AxiosError<Partial<ApiError>> | undefined)?.response?.data;
  return data?.error === 'NO_DRAFT' ? 'no-draft' : null;
};

/** "PNH → HKG": the corridor code without its mode prefix (the list groups by mode already). */
export const corridorShort = (code: string): string => code.replace(/^(AIR|RD)\s+/, '');

const pctOr = (value: number | undefined, words: (p: string) => string): string =>
  value == null ? '—' : words(pctText(value));

const daySpan = (b: FeeBand): string =>
  b.maxDays == null ? `${b.minDays}+ d` : `${b.minDays}–${b.maxDays} d`;

/**
 * The Percentages and policy panel in words. The fee bands are shown read-only: they serve deposits and
 * cancellation terms, which come with a later slice.
 */
export const policyRows = (
  policies: Partial<Record<RatePolicyKey, number>>,
  feeBands: FeeBand[],
): { key: string; label: string; value: string }[] => {
  const p = policies;
  const bands = (kind: FeeBand['kind'], value: (b: FeeBand) => string) => {
    const list = feeBands.filter((b) => b.kind === kind);
    return list.length ? list.map((b) => `${daySpan(b)} ${value(b)}`).join(' · ') : '—';
  };
  return [
    {
      key: 'FUEL_PCT',
      label: 'Fuel surcharge',
      value: pctOr(p.FUEL_PCT, (x) => `${x} · air lines only`),
    },
    {
      key: 'INSURANCE_PCT',
      label: 'Insurance',
      value: pctOr(p.INSURANCE_PCT, (x) => `${x} of declared value`),
    },
    {
      key: 'CONTINGENCY_PCT',
      label: 'Contingency',
      value: pctOr(p.CONTINGENCY_PCT, (x) => `${x} of cost base`),
    },
    {
      key: 'SERVICE_FEE_PCT',
      label: 'Service fee',
      value: pctOr(p.SERVICE_FEE_PCT, (x) => `${x} after contingency`),
    },
    { key: 'DEPOSIT_PCT', label: 'Deposit', value: pctOr(p.DEPOSIT_PCT, (x) => x) },
    {
      key: 'QUOTE_VALIDITY_DAYS',
      label: 'Quote validity',
      value: p.QUOTE_VALIDITY_DAYS == null ? '—' : `${p.QUOTE_VALIDITY_DAYS} days`,
    },
    {
      key: 'FLIGHT_VET_MIN_HORSES',
      label: 'Flight vet',
      value:
        p.FLIGHT_VET_MIN_HORSES == null || p.HIGH_VALUE_THRESHOLD == null
          ? '—'
          : `${p.FLIGHT_VET_MIN_HORSES}+ horses or > ${money(p.HIGH_VALUE_THRESHOLD)}`,
    },
    {
      key: 'SHORT_NOTICE',
      label: 'Short notice',
      value: bands('SHORT_NOTICE', (b) => `× ${b.value}`),
    },
    {
      key: 'CANCELLATION',
      label: 'Cancellation',
      value: bands('CANCELLATION', (b) => pctText(b.value)),
    },
    {
      key: 'ARRIVAL_WINDOW_PCT',
      label: 'Arrival window',
      value: pctOr(
        p.ARRIVAL_WINDOW_PCT,
        (x) =>
          `Road · +${x} of ground lines` +
          (p.ARRIVAL_WINDOW_MIN_HOURS == null ? '' : ` · ${p.ARRIVAL_WINDOW_MIN_HOURS} h minimum`),
      ),
    },
    {
      key: 'LATE_PENALTY_PCT_PER_HOUR',
      label: 'Late arrival',
      value: pctOr(
        p.LATE_PENALTY_PCT_PER_HOUR,
        (x) =>
          `${x} per started hour` +
          (p.LATE_PENALTY_CAP_PCT == null ? '' : ` · max ${pctText(p.LATE_PENALTY_CAP_PCT)}`),
      ),
    },
  ];
};

/**
 * Where a volume-break edit goes. A corridor with its own bands that unticks "own bands" loses them (the
 * shared bands then apply); the shared bands change only when they were the ones being edited.
 */
export const bandsSave = (
  scope: 'CORRIDOR' | 'GLOBAL',
  ownBands: boolean,
  bands: VolumeBreakInput[],
): { corridorScoped: boolean; bands: VolumeBreakInput[] } => {
  if (ownBands) return { corridorScoped: true, bands };
  if (scope === 'CORRIDOR') return { corridorScoped: true, bands: [] };
  return { corridorScoped: false, bands };
};
