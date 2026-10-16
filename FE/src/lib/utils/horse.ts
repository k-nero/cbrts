import type { Coat } from '@/components/ui/HorseCard';
import type { Tone } from '@/components/ui/tone';
import type { HorseCoat, HorseSex, SizeClass, StallType, Temperament } from '@/interfaces';

/*
 * How a horse reads on the page (DESIGN.md, Nameplate and Horse Card; Horse profile). Pure: the pages
 * pass today as a YYYY-MM-DD date in Asia/Ho_Chi_Minh.
 */

const DASH = '—';
const MIN_HH = 10.0;
const MAX_HH = 19.3;
/** The box stall raises a horse to at least this class (backend H-03a). */
const BOX_STALL_MIN_CLASS = 'L';

/** Whole years on `today`, or null without a date of birth. */
export const ageYears = (dateOfBirth: string | null | undefined, today: string): number | null => {
  if (!dateOfBirth) return null;
  const [by, bm, bd] = dateOfBirth.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  const beforeBirthday = tm < bm || (tm === bm && td < bd);
  return ty - by - (beforeBirthday ? 1 : 0);
};

/** "7 y". */
export const ageOf = (dateOfBirth: string | null | undefined, today: string): string => {
  const years = ageYears(dateOfBirth, today);
  return years === null ? DASH : `${years} y`;
};

/** "16.2 hh". */
export const formatHeight = (heightHh: number | null | undefined): string =>
  heightHh === null || heightHh === undefined ? DASH : `${heightHh.toFixed(1)} hh`;

/** "510 kg". */
export const formatWeight = (weightKg: number | null | undefined): string =>
  weightKg === null || weightKg === undefined ? DASH : `${weightKg.toLocaleString('en-US')} kg`;

/** "M · 32": the class and the stall width it takes, in inches. */
export const formatSize = (size: { code: string; widthIn: number } | null | undefined): string =>
  size ? `${size.code} · ${size.widthIn}` : DASH;

/** "250 259 600 123 456": the passport's grouping. */
export const formatMicrochip = (microchip: string | null | undefined): string => {
  const digits = microchip?.replace(/\s/g, '') ?? '';
  return digits ? (digits.match(/.{1,3}/g) ?? []).join(' ') : DASH;
};

/** "$85,000". */
export const formatValue = (value: number | null | undefined, currency = 'USD'): string =>
  value === null || value === undefined
    ? DASH
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);

const SEX_LABEL: Record<HorseSex, string> = {
  STALLION: 'Stallion',
  MARE: 'Mare',
  GELDING: 'Gelding',
  COLT: 'Colt',
  FILLY: 'Filly',
};

/** "Gelding". */
export const sexLabel = (sex: HorseSex | null | undefined): string => (sex ? SEX_LABEL[sex] : '');

/** The words the copy uses for the horse; before a sex is chosen, "the horse". */
export const pronouns = (
  sex: HorseSex | null | undefined,
): { subject: string; object: string; possessive: string } => {
  if (sex === 'MARE' || sex === 'FILLY') return { subject: 'she', object: 'her', possessive: 'her' };
  if (sex) return { subject: 'he', object: 'him', possessive: 'his' };
  return { subject: 'the horse', object: 'the horse', possessive: "the horse's" };
};

/** Hands are written hands.inches: the inch digit runs 0–3. Null when the height is one. */
export const heightProblem = (heightHh: number): string | null => {
  if (heightHh < MIN_HH || heightHh > MAX_HH) return 'Heights run from 10.0 to 19.3 hh.';
  const tenths = Math.round(heightHh * 10);
  const inches = tenths % 10;
  if (inches <= 3) return null;
  const hands = Math.floor(tenths / 10);
  return `${(tenths / 10).toFixed(1)} hh isn't a height: a hand is 4 inches, so ${hands}.3 hh is followed by ${hands + 1}.0 hh.`;
};

/** The size class the server will derive (H-03): the highest band at or below the height, a box stall at least L. */
export const sizeClassFor = (
  heightHh: number | null | undefined,
  requiredStall: StallType,
  classes: SizeClass[],
): SizeClass | null => {
  if (heightHh === null || heightHh === undefined || heightProblem(heightHh) !== null) return null;
  const byHeight = [...classes].sort((a, b) => a.minHeightHh - b.minHeightHh);
  const fits = byHeight.filter((c) => c.minHeightHh <= heightHh + 1e-9);
  let chosen = fits.at(-1) ?? null;
  if (chosen && requiredStall === 'BOX') {
    const box = byHeight.find((c) => c.code === BOX_STALL_MIN_CLASS);
    if (box && box.minHeightHh > chosen.minHeightHh) chosen = box;
  }
  return chosen;
};

/** The coat band; OTHER or no coat is the neutral band. */
export const coatOf = (coat: HorseCoat | null | undefined): Coat =>
  coat && coat !== 'OTHER' ? (coat.toLowerCase() as Coat) : 'other';

const TEMPERAMENT: Record<Temperament, { label: string; tone: Tone }> = {
  CALM: { label: 'Calm', tone: 'ok' },
  NERVOUS: { label: 'Nervous', tone: 'warn' },
  AGGRESSIVE: { label: 'Aggressive', tone: 'bad' },
};

export const temperamentChip = (
  temperament: Temperament | null | undefined,
): { label: string; tone: Tone } | null => (temperament ? TEMPERAMENT[temperament] : null);

/** A standard stall needs no chip. */
export const stallChip = (stall: StallType): { label: string; tone: Tone } | null => {
  if (stall === 'CLIMATE') return { label: 'Climate stall', tone: 'info' };
  if (stall === 'BOX') return { label: 'Box stall', tone: 'neutral' };
  return null;
};
