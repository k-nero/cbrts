import { type FC } from 'react';
import { useController } from 'react-hook-form';
import { Flex } from 'antd';

import type { HorseFormShape } from './HorseForm';

import { Checkbox } from '@/components/ui';

/** Climate-controlled and box stall: one value in the API, so ticking one unticks the other. */
export const StallTicks: FC = () => {
  const { field } = useController<HorseFormShape, 'requiredStall'>({ name: 'requiredStall' });
  return (
    <Flex gap={24}>
      <Checkbox
        label="Climate-controlled stall"
        checked={field.value === 'CLIMATE'}
        onChange={(e) => field.onChange(e.target.checked ? 'CLIMATE' : 'STANDARD')}
      />
      <Checkbox
        label="Box stall only"
        checked={field.value === 'BOX'}
        onChange={(e) => field.onChange(e.target.checked ? 'BOX' : 'STANDARD')}
      />
    </Flex>
  );
};
