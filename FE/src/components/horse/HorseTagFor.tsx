import type { FC } from 'react';

import { HorseTag } from '@/components/ui';
import { useHorseLook, useHorsePhotoUrl } from '@/hooks/horse';
import type { HorseCoat } from '@/interfaces';
import { coatOf } from '@/lib/utils';

type Props = {
  /** Looked up for the coat and photo when the page doesn't pass them. */
  horseId?: string | null;
  name: string;
  /** What the page already knows; a lookup fills in what it doesn't. */
  coat?: HorseCoat | string | null;
  photoFileId?: string | null;
  size?: 'md' | 'sm';
  className?: string;
};

/**
 * A horse tag from what a customer page has: the name, and the horse's id. The coat and photo come
 * from the page when it has them, otherwise from the club's horse (GET /customer/horses/{id}).
 */
export const HorseTagFor: FC<Props> = ({ horseId, name, coat, photoFileId, size, className }) => {
  const needsLookup = photoFileId === undefined || coat === undefined;
  const look = useHorseLook(needsLookup ? horseId : null);
  const fileId = photoFileId !== undefined ? photoFileId : look.data?.photoFileId;
  const coatValue = coat !== undefined ? coat : (look.data?.coat ?? null);
  const photoUrl = useHorsePhotoUrl(fileId);
  return (
    <HorseTag
      coat={coatOf(coatValue as HorseCoat | null)}
      name={name}
      photoUrl={photoUrl}
      size={size}
      className={className}
    />
  );
};
