import type { FC } from 'react';
import { Flex } from 'antd';

import { type Coat, HorseAvatar } from '@/components/ui';
import { useHorsePhotoUrl } from '@/hooks/horse';
import type { Horse } from '@/interfaces';
import { coatOf } from '@/lib/utils';

/** One horse on the pass: her photo, or her coat colour, ringed in the card colour so they overlap cleanly. */
const PassHorse: FC<{ coat: Coat; photoFileId: string | null }> = ({ coat, photoFileId }) => (
  <span className="flex shrink-0 rounded-full bg-card p-0.5">
    <HorseAvatar coat={coat} photoUrl={useHorsePhotoUrl(photoFileId)} size={24} />
  </span>
);

/** The picked horses as overlapping photo circles with the count, as on the pass. */
export const HorseSwatches: FC<{ ids: string[]; horses: Horse[] }> = ({ ids, horses }) => (
  <Flex component="span" align="center" gap={8}>
    <span className="flex -space-x-2">
      {ids.slice(0, 6).map((id) => {
        const horse = horses.find((h) => h.id === id);
        return (
          <PassHorse
            key={id}
            coat={coatOf(horse?.coat ?? null)}
            photoFileId={horse?.photoFileId ?? null}
          />
        );
      })}
    </span>
    <span className="type-data text-ink">
      {ids.length} {ids.length === 1 ? 'horse' : 'horses'}
    </span>
  </Flex>
);
