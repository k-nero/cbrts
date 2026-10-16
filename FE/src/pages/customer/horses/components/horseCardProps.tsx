import type { ComponentProps, ReactNode } from 'react';

import { Chip, HorseCard } from '@/components/ui';
import type { Horse } from '@/interfaces';
import {
  ageOf,
  coatOf,
  formatDate,
  formatHeight,
  formatMicrochip,
  formatSize,
  formatValue,
  formatWeight,
  sexLabel,
  stallChip,
  temperamentChip,
} from '@/lib/utils';

/** What a horse card shows: a saved horse, or the Add form's values as they are typed. */
export type HorseCardSource = Pick<
  Horse,
  'name' | 'breed' | 'dateOfBirth' | 'microchip' | 'valueCurrency' | 'handlingNotes' | 'requiredStall'
> & {
  coat: Horse['coat'] | undefined;
  sex: Horse['sex'] | null | undefined;
  heightHh: number | null | undefined;
  weightKg: number | null | undefined;
  declaredValue: number | null | undefined;
  temperament: Horse['temperament'] | undefined;
  sizeClass: { code: string; widthIn: number } | null;
};

type CardProps = Omit<ComponentProps<typeof HorseCard>, 'actions' | 'status'>;

const DASH = '—';

/** "Andalusian · Gelding", the sex alone without a breed. */
const subtitleOf = (breed: string | null, sex: HorseCardSource['sex']): string =>
  [breed?.trim(), sexLabel(sex)].filter(Boolean).join(' · ');

/** The temperament and stall chips (DESIGN.md, Nameplate and Horse Card), or nothing. */
export const horseChips = (source: Pick<HorseCardSource, 'temperament' | 'requiredStall'>): ReactNode => {
  const chips = [temperamentChip(source.temperament), stallChip(source.requiredStall)].filter(
    (c) => c !== null,
  );
  if (chips.length === 0) return null;
  return (
    <>
      {chips.map((c) => (
        <Chip key={c.label} tone={c.tone}>
          {c.label}
        </Chip>
      ))}
    </>
  );
};

/** A horse as the card reads it; `today` is YYYY-MM-DD in Asia/Ho_Chi_Minh. */
export const horseCardProps = (source: HorseCardSource, today: string): CardProps => ({
  coat: coatOf(source.coat),
  name: source.name.trim() || DASH,
  subtitle: subtitleOf(source.breed, source.sex) || undefined,
  tags: horseChips(source),
  facts: {
    age: ageOf(source.dateOfBirth, today),
    height: formatHeight(source.heightHh),
    weight: formatWeight(source.weightKg),
    size: formatSize(source.sizeClass),
  },
  microchip: formatMicrochip(source.microchip),
  declaredValue: formatValue(source.declaredValue, source.valueCurrency),
  notes: source.handlingNotes?.trim() || undefined,
});

/** "Archived · 3 Oct 2026". */
export const archivedChip = (archivedAt: string): ReactNode => (
  <Chip tone="neutral">Archived · {formatDate(archivedAt)}</Chip>
);
