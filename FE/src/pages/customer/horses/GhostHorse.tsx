import type { FC } from 'react';

import { Nameplate } from '@/components/ui';

/** The horse the club is about to make: an empty brass nameplate on a dashed band. */
export const GhostHorse: FC = () => (
  <div className="flex w-[272px] shrink-0 flex-col gap-2.5">
    <div className="relative h-[148px] rounded-lg border border-dashed border-line-strong bg-muted">
      <Nameplate
        name="Your first horse"
        subtitle="Breed · sex"
        className="absolute bottom-5 left-5"
      />
    </div>
    <p className="type-body-s m-0 text-ink-3">
      Each horse gets a brass nameplate on its coat colour, and every request starts from it.
    </p>
  </div>
);
