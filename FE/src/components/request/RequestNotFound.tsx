import type { FC } from 'react';

import { Button } from '@/components/ui';
import { useCustomRouter } from '@/router/route.hook';

/**
 * A request the API answers 404 for: for a customer, missing, discarded or another club's; for staff,
 * missing or still a club's draft. The defaults are the customer's.
 */
export const RequestNotFound: FC<{
  message?: string;
  back?: { label: string; onClick: () => void };
}> = ({ message = 'It may have been discarded, or it belongs to another club.', back }) => {
  const router = useCustomRouter();
  return (
    <div className="flex flex-col items-start gap-3 pt-[46px]">
      <h1 className="type-display-m m-0 text-ink">We couldn’t find this request</h1>
      <p className="type-body-m m-0 text-ink-2">{message}</p>
      <Button onClick={back?.onClick ?? (() => router.push(router.paths.get('my-requests')))}>
        {back?.label ?? 'Back to My requests'}
      </Button>
    </div>
  );
};
