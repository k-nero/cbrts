import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fileApi } from '@/apis/file';

/**
 * A blob URL for a stored file, fetched with the access token and revoked when it changes or unmounts.
 * `quiet` is for a picture that only decorates (a horse's photo): a failed fetch leaves `url` undefined,
 * so the caller's fallback shows, instead of throwing to the route's error boundary.
 */
export const useFileBlobUrl = (id: string, options: { quiet?: boolean } = {}) => {
  const query = useQuery({
    queryKey: ['files', id, 'blob'],
    queryFn: () => fileApi.getBlob(id),
    enabled: Boolean(id),
    staleTime: Infinity,
    ...(options.quiet ? { throwOnError: false, retry: false } : {}),
  });
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!query.data) {
      setUrl(undefined);
      return;
    }
    const nextUrl = URL.createObjectURL(query.data);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [query.data]);
  return { ...query, url };
};
