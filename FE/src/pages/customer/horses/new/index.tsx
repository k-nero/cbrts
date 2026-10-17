import type { FC } from 'react';
import { App } from 'antd';

import HorseForm, { type HorseFormShape } from '../components/HorseForm';
import { horseCardProps } from '../components/horseCardProps';
import { DocumentsComeLater, WhyWeAsk } from '../components/SidePanels';

import PageHeader from '@/components/PageHeader';
import { HorseCard } from '@/components/ui';
import { useHorseCount, useSaveHorse, useSizeClasses } from '@/hooks/horse';
import type { HorseCoat, HorseSex } from '@/interfaces';
import { ict, pronouns, sizeClassFor } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

const today = () => ict(new Date().toISOString()).format('YYYY-MM-DD');

/** "How he'll appear": the real card, built from the form as it is typed (DESIGN.md, First run). */
const HowItAppears: FC<{ values: HorseFormShape }> = ({ values }) => {
  const { data: classes } = useSizeClasses();
  const sex = (values.sex?.value ?? null) as HorseSex | null;
  const { subject } = pronouns(sex);
  const heading = subject === 'the horse' ? 'How the horse will appear' : `How ${subject}’ll appear`;
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
        <p className="type-body-s m-0 text-ink-3">On My horses and in every request. It updates as you type.</p>
      </div>
      <HorseCard {...card} />
    </section>
  );
};

/** Add a horse (spec §5.3); saving opens the new horse's profile. */
const AddHorsePage: FC = () => {
  const router = useCustomRouter();
  const { message } = App.useApp();
  const save = useSaveHorse();
  const active = useHorseCount(false, true);
  const archived = useHorseCount(true, active.data === 0);
  const firstRun = active.data === 0 && archived.data === 0;

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        back={{ label: 'My horses', onClick: () => router.push(router.paths.get('my-horses')) }}
        title="Add a horse"
        summary={
          firstRun
            ? 'Your first horse. You can add more after saving.'
            : 'Saved horses are ready for your next request.'
        }
      />
      <HorseForm
        submitLabel="Save horse"
        isSaving={save.isPending}
        onSubmit={(input) => save.mutateAsync({ input })}
        onCancel={() => router.push(router.paths.get('my-horses'))}
        onSaved={(horse) => {
          message.success(`${horse.name} is saved.`);
          // Saved, so there is nothing unsaved to ask about.
          router.push(router.paths.get('horse-profile', { pathParams: [horse.id] }), { force: true });
        }}
        side={(values) => (
          <>
            <HowItAppears values={values} />
            <WhyWeAsk />
            <DocumentsComeLater />
          </>
        )}
      />
    </div>
  );
};

export default AddHorsePage;
