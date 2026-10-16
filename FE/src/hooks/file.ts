import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fileApi } from '@/apis/file';

/** A blob URL for a stored file, fetched with the access token and revoked when it changes or unmounts. */
export const useFileBlobUrl = (id: string) => {
  const query = useQuery({
    queryKey: ['files', id, 'blob'],
    queryFn: () => fileApi.getBlob(id),
    enabled: Boolean(id),
    staleTime: Infinity,
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
