import { type FC, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Skeleton } from 'antd';
import type { AxiosError } from 'axios';

import { FactGrid } from '../components/FactGrid';
import HorseHeader from '../components/HorseHeader';
import { DocumentsComeLater } from '../components/SidePanels';

import ArchiveHorseModal from './ArchiveHorseModal';

import { Button, Callout, Chip, Panel } from '@/components/ui';
import { useHorse } from '@/hooks/horse';
import type { Horse, StallType } from '@/interfaces';
import {
  ageYears,
  formatDate,
  formatHeight,
  formatSize,
  formatValue,
  formatWeight,
  ict,
  pronouns,
  temperamentChip,
} from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

const STALL: Record<StallType, string> = {
  STANDARD: 'Standard',
  CLIMATE: 'Climate-controlled',
  BOX: 'Box stall only',
};

/** "4 years · born 2022". */
const ageLine = (horse: Horse, today: string): string => {
  const years = ageYears(horse.dateOfBirth, today);
  if (years === null || !horse.dateOfBirth) return '—';
  return `${years} ${years === 1 ? 'year' : 'years'} · born ${horse.dateOfBirth.slice(0, 4)}`;
};

/** A missing horse, or another club's (the API answers 404 for both). */
export const HorseNotFound: FC = () => {
  const router = useCustomRouter();
  return (
    <div className="flex flex-col items-start gap-3 pt-[46px]">
      <h1 className="type-display-m m-0 text-ink">We couldn’t find this horse</h1>
      <p className="type-body-m m-0 text-ink-2">
        It may have been removed, or it belongs to another club.
      </p>
      <Button onClick={() => router.push(router.paths.get('my-horses'))}>Back to My horses</Button>
    </div>
  );
};

/** Loading, not found or failed: what a horse page shows until its horse arrives. */
export const HorseLoadState: FC<{ query: ReturnType<typeof useHorse> }> = ({ query }) => {
  if (query.isPending) {
    return (
      <div className="flex flex-col gap-6 pt-[46px]" aria-busy>
        <Skeleton.Node active className="!h-[132px] !w-full" />
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }
  if ((query.error as AxiosError | null)?.response?.status === 404) return <HorseNotFound />;
  return (
    <div className="pt-[46px]">
      <Callout
        tone="bad"
        title="This horse didn't load"
        action={
          <Button size="sm" onClick={() => query.refetch()}>
            Try again
          </Button>
        }
      >
        Nothing has changed. Check your connection and try again.
      </Callout>
    </div>
  );
};

/** The horse profile (spec §6). */
const HorseProfilePage: FC = () => {
  const { id = '' } = useParams();
  const router = useCustomRouter();
  const query = useHorse(id);
  const [archiving, setArchiving] = useState(false);
  const horse = query.data;
  if (!horse) return <HorseLoadState query={query} />;

  const today = ict(new Date().toISOString()).format('YYYY-MM-DD');
  const { subject } = pronouns(horse.sex);
  const temperament = temperamentChip(horse.temperament);

  return (
    <div className="flex flex-col gap-7">
      <HorseHeader
        horse={horse}
        right={
          horse.archivedAt ? (
            <Chip tone="neutral">Archived {formatDate(horse.archivedAt)}</Chip>
          ) : (
            <Button
              leadingIcon="pencil"
              onClick={() =>
                router.push(router.paths.get('horse-edit', { pathParams: [horse.id] }))
              }
            >
              Edit profile
            </Button>
          )
        }
      />
      <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-6">
        <div className="flex flex-col gap-6">
          <Panel title={`What ${subject} needs to travel`}>
            <div className="flex flex-col gap-3">
              <FactGrid
                facts={[
                  { label: 'Stall', value: STALL[horse.requiredStall] },
                  { label: 'Size class', value: `${formatSize(horse.sizeClass)} in`, mono: true },
                  { label: 'Weight', value: formatWeight(horse.weightKg), mono: true },
                  { label: 'Height', value: formatHeight(horse.heightHh), mono: true },
                  { label: 'Age', value: ageLine(horse, today) },
                  { label: 'Temperament', value: temperament?.label ?? 'Not given' },
                ]}
              />
              {horse.handlingNotes && (
                <p className="type-body-s m-0 text-ink-2">Handling notes: {horse.handlingNotes}</p>
              )}
              <p className="type-body-s m-0 text-ink-3">
                Read by the load plan and by every quotation.
              </p>
            </div>
          </Panel>
          <DocumentsComeLater />
        </div>
        <div className="flex flex-col gap-6">
          <Panel title="Declared value">
            <div className="flex flex-col gap-1.5">
              <span className="type-display-m text-ink">
                {formatValue(horse.declaredValue, horse.valueCurrency)}
              </span>
              <span className="type-body-s text-ink-3">
                Used for insurance on quotations: 1.5% when you insure through us.
              </span>
            </div>
          </Panel>
          {!horse.archivedAt && (
            <div>
              <Button variant="ghost" onClick={() => setArchiving(true)}>
                Archive horse
              </Button>
            </div>
          )}
        </div>
      </div>
      <ArchiveHorseModal horse={horse} open={archiving} onClose={() => setArchiving(false)} />
    </div>
  );
};

export default HorseProfilePage;
