import type { FC } from 'react';
import { Skeleton } from 'antd';
import type { AxiosError } from 'axios';

import { Button, Callout } from '@/components/ui';
import { useCustomRouter } from '@/router/route.hook';

/** A missing request, a discarded draft, or another club's (the API answers 404 for all three). */
export const RequestNotFound: FC = () => {
  const router = useCustomRouter();
  return (
    <div className="flex flex-col items-start gap-3 pt-[46px]">
      <h1 className="type-display-m m-0 text-ink">We couldn’t find this request</h1>
      <p className="type-body-m m-0 text-ink-2">
        It may have been discarded, or it belongs to another club.
      </p>
      <Button onClick={() => router.push(router.paths.get('my-requests'))}>
        Back to My requests
      </Button>
    </div>
  );
};

type LoadQuery = { isPending: boolean; error: unknown; refetch: () => unknown };

/** Loading, not found or failed: what a request page shows until its request arrives. */
export const RequestLoadState: FC<{ query: LoadQuery }> = ({ query }) => {
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
  if ((query.error as AxiosError | null)?.response?.status === 404) return <RequestNotFound />;
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
