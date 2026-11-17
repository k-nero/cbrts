import { type FC } from 'react';
import { useController, useWatch } from 'react-hook-form';
import { Flex } from 'antd';

import { DerivedLine } from './DerivedLine';
import type { HorseFormShape } from './HorseForm';

import { Checkbox, Chip } from '@/components/ui';
import { boxStallNote, stallChip } from '@/lib/utils';

/**
 * Climate-controlled and box stall: one value in the API, so ticking one unticks the other. An aggressive horse always
 * travels in a box stall (stallFor), so for it the stall is a fact, shown the way the size class is, not a choice.
 */
export const StallTicks: FC = () => {
  const { field } = useController<HorseFormShape, 'requiredStall'>({ name: 'requiredStall' });
  const temperament = useWatch<HorseFormShape, 'temperament'>({ name: 'temperament' });
  if (temperament === 'AGGRESSIVE') {
    const box = stallChip('BOX');
    return (
      <DerivedLine>
        {box && <Chip tone={box.tone}>{box.label}</Chip>}
        <span className="type-body-s text-ink-2">{boxStallNote(field.value)}</span>
      </DerivedLine>
    );
  }
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
