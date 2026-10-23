import { type FC, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Flex } from 'antd';

import { FactGrid } from '../components/FactGrid';
import HorseHeader from '../components/HorseHeader';
import { DocumentsComeLater } from '../components/DocumentsComeLater';

import ArchiveHorseModal from './ArchiveHorseModal';
import { HorseLoadState } from './HorseLoadState';

import { Button, Chip, Panel } from '@/components/ui';
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
    <Flex vertical gap={28}>
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
        <Flex vertical gap={24}>
          <Panel title={`What ${subject} needs to travel`}>
            <Flex vertical gap={12}>
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
            </Flex>
          </Panel>
          <DocumentsComeLater />
        </Flex>
        <Flex vertical gap={24}>
          <Panel title="Declared value">
            <Flex vertical gap={6}>
              <span className="type-display-m text-ink">
                {formatValue(horse.declaredValue, horse.valueCurrency)}
              </span>
              <span className="type-body-s text-ink-3">
                Used for insurance on quotations: 1.5% when you insure through us.
              </span>
            </Flex>
          </Panel>
          {!horse.archivedAt && (
            <div>
              <Button variant="ghost" onClick={() => setArchiving(true)}>
                Archive horse
              </Button>
            </div>
          )}
        </Flex>
      </div>
      <ArchiveHorseModal horse={horse} open={archiving} onClose={() => setArchiving(false)} />
    </Flex>
  );
};

export default HorseProfilePage;
