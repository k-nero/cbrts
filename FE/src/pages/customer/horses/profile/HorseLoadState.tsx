import { type FC } from 'react';
import { Skeleton } from 'antd';
import type { AxiosError } from 'axios';

import { HorseNotFound } from './HorseNotFound';

import { Button, Callout } from '@/components/ui';
import { useHorse } from '@/hooks/horse';

/** Loading, not found or failed: what a horse page shows until its horse arrives. */
export const HorseLoadState: FC<{ query: ReturnType<typeof useHorse> }> = ({ query }) => {
  if (query.isPending) {
    return (
      <div className="flex flex-col gap-6 pt-[46px]" aria-busy>
        <Skeleton.Node active className="!h-[132px] !w-full" />
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }
  if ((query.error as AxiosError | null)?.response?.status === 404) return <HorseNotFound />;
  return (
    <div className="pt-[46px]">
      <Callout
        tone="bad"
        title="This horse didn't load"
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
