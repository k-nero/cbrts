import type { FC } from 'react';

import { type HorseFormShape } from '../components/HorseForm';
import { horseCardProps } from '../components/horseCardProps';

import { HorseCard } from '@/components/ui';
import { useSizeClasses } from '@/hooks/horse';
import type { HorseCoat, HorseSex } from '@/interfaces';
import { ict, pronouns, sizeClassFor } from '@/lib/utils';

const today = () => ict(new Date().toISOString()).format('YYYY-MM-DD');

/** "How he'll appear": the real card, built from the form as it is typed (DESIGN.md, First run). */
export const HowItAppears: FC<{ values: HorseFormShape }> = ({ values }) => {
  const { data: classes } = useSizeClasses();
  const sex = (values.sex?.value ?? null) as HorseSex | null;
  const { subject } = pronouns(sex);
  const heading =
    subject === 'the horse' ? 'How the horse will appear' : `How ${subject}’ll appear`;
  const card = horseCardProps(
    {
      name: values.name ?? '',
      coat: (values.coat?.value ?? null) as HorseCoat | null,
      breed: values.breed ?? null,
      sex,
      dateOfBirth: values.dateOfBirth ?? null,
      heightHh: values.heightHh,
      weightKg: values.weightKg,
      sizeClass: sizeClassFor(values.heightHh, values.requiredStall ?? 'STANDARD', classes ?? []),
      microchip: values.microchip ?? null,
      declaredValue: values.declaredValue,
      valueCurrency: 'USD',
      temperament: values.temperament,
      requiredStall: values.requiredStall ?? 'STANDARD',
      handlingNotes: values.handlingNotes ?? null,
    },
    today(),
  );
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h4 className="type-h4 m-0 text-ink">{heading}</h4>
        <p className="type-body-s m-0 text-ink-3">
          On My horses and in every request. It updates as you type.
        </p>
      </div>
      <HorseCard {...card} />
    </section>
  );
};
