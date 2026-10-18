import { money } from './quotation';

import type {
  ApiError,
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
