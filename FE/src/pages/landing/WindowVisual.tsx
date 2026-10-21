import type { FC } from 'react';

import { Visual } from './Visual';

import { Chip } from '@/components/ui';

/** A test valid today that lapses in transit: its date sits before the 60-day window. */
export const WindowVisual: FC = () => (
  <Visual label="An EIA test dated 2 Aug falls before the 60-day window for an 18 Oct departure">
    <div className="relative h-7 w-full" aria-hidden>
      <span className="absolute top-[13px] h-0.5 w-full bg-line-strong" />
      <span className="absolute top-[9px] left-1/2 h-2.5 w-[49%] rounded-full border border-ok-line bg-ok-soft" />
      <span className="absolute top-2 left-[30%] size-3 rounded-full bg-warn" />
      <span className="absolute top-0 right-0 h-7 w-0.5 bg-ink" />
    </div>
    <span className="flex flex-wrap gap-x-2 gap-y-1">
      <span className="type-caption text-warn">Test 2 Aug</span>
      <span className="type-caption text-ok">60-day window</span>
      <span className="type-caption text-ink">Departs 18 Oct</span>
    </span>
    <Chip tone="warn">Expires in transit</Chip>
  </Visual>
);
