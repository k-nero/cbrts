import { useFileBlobUrl } from '@/hooks/file';
import type { TripPhoto } from '@/interfaces';

export function Photo({ photo }: { photo: TripPhoto }) {
  const image = useFileBlobUrl(photo.id);
  return image.url ? (
    <a href={image.url} target="_blank" rel="noreferrer">
      <img src={image.url} alt={photo.fileName} className="size-20 rounded-md object-cover" />
    </a>
  ) : null;
}
