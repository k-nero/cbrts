import type { FC, ReactNode } from 'react';

import { horseChips } from './horseCardProps';

import PageHeader from '@/components/PageHeader';
import { CoatBand } from '@/components/ui';
import type { Horse } from '@/interfaces';
import { ageOf, coatOf, formatMicrochip, ict, sexLabel } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

/** "Thoroughbred · mare · 4 y · black". */
const summaryLine = (horse: Horse, today: string): string =>
  [
    horse.breed,
    sexLabel(horse.sex).toLowerCase(),
    horse.dateOfBirth ? ageOf(horse.dateOfBirth, today) : null,
    horse.coat && horse.coat !== 'OTHER' ? horse.coat.toLowerCase() : null,
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * The horse's page header (frame: My horses · Nightfall): the coat band with the brass nameplate
 * stands in for the title; then the microchip, the summary line and the chips.
 */
const HorseHeader: FC<{ horse: Horse; right?: ReactNode }> = ({ horse, right }) => {
  const router = useCustomRouter();
  const today = ict(new Date().toISOString()).format('YYYY-MM-DD');
  const chips = horseChips(horse);
  return (
    <PageHeader
      back={{ label: 'My horses', onClick: () => router.push(router.paths.get('my-horses')) }}
      banner={
        <CoatBand
          coat={coatOf(horse.coat)}
          name={horse.name}
          subtitle={[horse.breed, sexLabel(horse.sex)].filter(Boolean).join(' · ')}
          height={132}
          className="rounded-xl"
        />
      }
      summary={
        <div className="flex flex-col gap-2">
          <span className="type-data text-ink">{formatMicrochip(horse.microchip)}</span>
          <span>{summaryLine(horse, today)}</span>
          {chips && <span className="flex flex-wrap gap-1.5">{chips}</span>}
        </div>
      }
      right={right}
    />
  );
};

export default HorseHeader;
