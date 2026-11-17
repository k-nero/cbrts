import { type FC } from 'react';
import { useController, useWatch } from 'react-hook-form';
import { Flex } from 'antd';

import type { HorseFormShape } from './HorseForm';

import { Checkbox, Chip } from '@/components/ui';

/**
 * Climate-controlled and box stall: one value in the API, so ticking one unticks the other. An aggressive horse always
 * travels in a box stall (stallFor), so for it the stall is a fact, shown the way the size class is, not a choice.
 */
export const StallTicks: FC = () => {
  const { field } = useController<HorseFormShape, 'requiredStall'>({ name: 'requiredStall' });
  const temperament = useWatch<HorseFormShape, 'temperament'>({ name: 'temperament' });
  if (temperament === 'AGGRESSIVE')
    return (
      <div className="rounded-sm bg-sunken px-4 py-3">
        <Flex align="center" gap={12}>
          <Chip tone="neutral">Box stall</Chip>
          <span className="type-body-s text-ink-2">
            Aggressive horses always travel alone in a box stall, so it is set for this horse.
          </span>
        </Flex>
      </div>
    );
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
