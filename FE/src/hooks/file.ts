import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fileApi } from '@/apis/file';

export const useFileBlobUrl = (id: string, contentUrl: string) => {
  const query = useQuery({
    queryKey: ['files', id, 'blob'],
    queryFn: () => fileApi.getBlob(contentUrl),
    enabled: Boolean(id),
    staleTime: Infinity,
  });
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!query.data) { setUrl(undefined); return; }
    const nextUrl = URL.createObjectURL(query.data);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [query.data]);
  return { ...query, url };
};
