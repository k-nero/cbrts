import type { FC } from 'react';
import { Flex } from 'antd';

import { HorseTagFor } from '@/components/horse/HorseTagFor';
import type { CustomerQuotation } from '@/interfaces';

/** The quoted horses as horse tags: the coat as quoted, the photo as the horse has it now. */
export const QuotedHorses: FC<{ quotation: CustomerQuotation }> = ({ quotation }) => (
  <Flex component="span" wrap align="center" justify="end" gap={8}>
    {quotation.request.horses.map((h) => (
      <HorseTagFor key={h.id} horseId={h.id} name={h.name} coat={h.coat} />
    ))}
  </Flex>
);
