import type { FC } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { App, Flex } from 'antd';

import HorseForm from '../components/HorseForm';
import HorseHeader from '../components/HorseHeader';
import PassportPanel from '../components/PassportPanel';
import { HorseLoadState } from '../profile/HorseLoadState';

import { useHorse, useSaveHorse } from '@/hooks/horse';
import { useCustomRouter } from '@/router/route.hook';

/** Edit (spec §5.4): the profile's header, the form, and the locked passport panel once submitted. */
const EditHorsePage: FC = () => {
  const { id = '' } = useParams();
  const router = useCustomRouter();
  const { message } = App.useApp();
  const query = useHorse(id);
  const save = useSaveHorse();
  const horse = query.data;
  if (!horse) return <HorseLoadState query={query} />;

  const profile = router.paths.get('horse-profile', { pathParams: [horse.id] });
  // The API refuses to update an archived horse (HORSE_ARCHIVED); its profile is read-only.
  if (horse.archivedAt) return <Navigate to={profile} replace />;

  return (
    <Flex vertical gap={28}>
      <HorseHeader horse={horse} right={<span className="type-caption text-ink-3">Editing</span>} />
      <HorseForm
        key={horse.updatedAt}
        horse={horse}
        submitLabel="Save changes"
        isSaving={save.isPending}
        onSubmit={(input) => save.mutateAsync({ id: horse.id, input })}
        onCancel={() => router.push(profile)}
        onSaved={(saved) => {
          message.success(`${saved.name} is updated.`);
          router.push(profile, { force: true });
        }}
        afterForm={horse.identityLocked ? <PassportPanel horse={horse} /> : undefined}
      />
    </Flex>
  );
};

export default EditHorsePage;
