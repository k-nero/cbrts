import type { FC } from 'react';
import { Flex } from 'antd';

import { COAT_SWATCH, cx } from '@/components/ui';
import type { CustomerQuotation, HorseCoat } from '@/interfaces';
import { coatOf } from '@/lib/utils';

/** The horses as coat swatches with their names, as on the pass. */
export const QuotedHorses: FC<{ quotation: CustomerQuotation }> = ({ quotation }) => (
  <Flex component="span" align="center" justify="end" gap={8}>
    <span className="flex -space-x-1.5">
      {quotation.request.horses.slice(0, 6).map((h) => (
        <span
          key={h.id}
          aria-hidden
          className={cx(
            'size-4 rounded-full border-2 border-card',
            COAT_SWATCH[coatOf(h.coat as HorseCoat | null)],
          )}
        />
      ))}
    </span>
    <span className="type-label-s text-ink">
      {quotation.request.horses.map((h) => h.name).join(', ')}
    </span>
  </Flex>
);
