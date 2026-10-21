import type { FC, ReactNode } from 'react';
import { Skeleton } from 'antd';
import type { AxiosError } from 'axios';

import { RequestNotFound } from './RequestNotFound';

import { Button, Callout } from '@/components/ui';

type LoadQuery = { isPending: boolean; error: unknown; refetch: () => unknown };

/** Loading, not found or failed: what a request page shows until its request arrives. */
export const RequestLoadState: FC<{ query: LoadQuery; notFound?: ReactNode }> = ({
  query,
  notFound,
}) => {
  if (query.isPending) {
    return (
      <div className="flex flex-col gap-6 pt-[46px]" aria-busy>
        <Skeleton active title={{ width: 360 }} paragraph={{ rows: 1, width: 640 }} />
        <div className="grid grid-cols-[minmax(0,1fr)_400px] gap-6">
          <Skeleton active paragraph={{ rows: 8 }} />
          <Skeleton.Node active className="!h-[420px] !w-full" />
        </div>
      </div>
    );
  }
  if ((query.error as AxiosError | null)?.response?.status === 404)
    return <>{notFound ?? <RequestNotFound />}</>;
  return (
    <div className="pt-[46px]">
      <Callout
        tone="bad"
        title="This request didn't load"
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
