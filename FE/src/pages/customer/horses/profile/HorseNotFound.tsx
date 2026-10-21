import { type FC } from 'react';

import { Button } from '@/components/ui';
import { useCustomRouter } from '@/router/route.hook';

/** A missing horse, or another club's (the API answers 404 for both). */
export const HorseNotFound: FC = () => {
  const router = useCustomRouter();
  return (
    <div className="flex flex-col items-start gap-3 pt-[46px]">
      <h1 className="type-display-m m-0 text-ink">We couldn’t find this horse</h1>
      <p className="type-body-m m-0 text-ink-2">
        It may have been removed, or it belongs to another club.
      </p>
      <Button onClick={() => router.push(router.paths.get('my-horses'))}>Back to My horses</Button>
    </div>
  );
};
