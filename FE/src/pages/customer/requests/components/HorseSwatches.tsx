import type { FC } from 'react';

import { COAT_SWATCH, cx } from '@/components/ui';
import type { Horse } from '@/interfaces';
import { coatOf } from '@/lib/utils';

/** The picked horses as overlapping coat swatches with the count, as on the pass. */
export const HorseSwatches: FC<{ ids: string[]; horses: Horse[] }> = ({ ids, horses }) => (
  <span className="flex items-center gap-2">
    <span className="flex -space-x-1.5">
      {ids.slice(0, 6).map((id) => {
        const coat = coatOf(horses.find((h) => h.id === id)?.coat ?? null);
        return (
          <span
            key={id}
            aria-hidden
            className={cx('size-4 rounded-full border-2 border-card', COAT_SWATCH[coat])}
          />
        );
      })}
    </span>
    <span className="type-data text-ink">
      {ids.length} {ids.length === 1 ? 'horse' : 'horses'}
    </span>
  </span>
);
