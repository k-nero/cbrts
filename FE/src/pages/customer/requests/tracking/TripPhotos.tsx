import type { FC } from 'react';
import { Image } from 'antd';
import { motion } from 'motion/react';

import { Icon } from '@/components/ui';
import { useFileBlobUrl } from '@/hooks/file';
import type { TripPhoto } from '@/interfaces';
import { fade } from '@/lib/motion';

/** A photo the escort took, with the horse it shows. */
export type HorsePhoto = TripPhoto & { horseName: string };

const Thumb: FC<{ photo: HorsePhoto }> = ({ photo }) => {
  const file = useFileBlobUrl(photo.id);
  if (!photo.contentType.startsWith('image/'))
    return (
      <a
        href={file.url}
        target="_blank"
        rel="noreferrer"
        className="type-body-s flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-ink-2"
      >
        <Icon name="file" size={14} />
        {photo.horseName} · {photo.fileName}
      </a>
    );
  return (
    <figure className="m-0 flex flex-col gap-1">
      {file.url ? (
        // The photo fades in over its placeholder once it has loaded.
        <motion.span variants={fade} initial="hidden" animate="shown" className="block">
          <Image
            src={file.url}
            alt={`${photo.horseName}: ${photo.fileName}`}
            width={72}
            height={72}
            className="rounded-md object-cover"
          />
        </motion.span>
      ) : (
        <span aria-hidden className="block size-18 animate-pulse rounded-md bg-sunken" />
      )}
      <figcaption className="type-caption max-w-18 truncate text-ink-3">
        {photo.horseName}
      </figcaption>
    </figure>
  );
};

/** The photos on a record, small; a click opens them full size, one after another. */
export const TripPhotos: FC<{ photos: HorsePhoto[] }> = ({ photos }) =>
  photos.length === 0 ? null : (
    <Image.PreviewGroup>
      <div className="flex flex-wrap gap-2.5 pt-1">
        {photos.map((p) => (
          <Thumb key={p.id} photo={p} />
        ))}
      </div>
    </Image.PreviewGroup>
  );
