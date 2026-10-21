import type { FC } from 'react';
import { App } from 'antd';

import HorseForm from '../components/HorseForm';
import { DocumentsComeLater } from '../components/DocumentsComeLater';
import { WhyWeAsk } from '../components/WhyWeAsk';
import { HowItAppears } from './HowItAppears';

import PageHeader from '@/components/PageHeader';
import { useHorseCount, useSaveHorse } from '@/hooks/horse';
import { useCustomRouter } from '@/router/route.hook';

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
          router.push(router.paths.get('horse-profile', { pathParams: [horse.id] }), {
            force: true,
          });
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
