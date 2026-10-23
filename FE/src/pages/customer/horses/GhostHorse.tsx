import type { FC } from 'react';
import { Flex } from 'antd';

import { Nameplate } from '@/components/ui';

/** The horse the club is about to make: an empty brass nameplate on a dashed band. */
export const GhostHorse: FC = () => (
  <Flex vertical gap={10} className="w-[272px] shrink-0">
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
  </Flex>
);
