import { type FC } from 'react';
import { useWatch } from 'react-hook-form';
import { Flex } from 'antd';

import type { HorseFormShape } from './HorseForm';

import { Chip } from '@/components/ui';
import { useSizeClasses } from '@/hooks/horse';
import { formatHeight, sizeClassFor } from '@/lib/utils';

/** "Size M · 32 in. Worked out from 16.0 hh." */
export const SizeLine: FC = () => {
  const heightHh = useWatch<HorseFormShape, 'heightHh'>({ name: 'heightHh' });
  const requiredStall = useWatch<HorseFormShape, 'requiredStall'>({ name: 'requiredStall' });
  const { data: classes } = useSizeClasses();
  const size = sizeClassFor(heightHh, requiredStall ?? 'STANDARD', classes ?? []);
  return (
    <div className="rounded-sm bg-sunken px-4 py-3">
      <Flex align="center" gap={12}>
        {size ? (
          <>
            <Chip tone="neutral">
              Size {size.code} · {size.widthIn} in
            </Chip>
            <span className="type-body-s text-ink-2">
              Worked out from {formatHeight(heightHh)}. It decides the stall width and the air
              position.
            </span>
          </>
        ) : (
          <span className="type-body-s text-ink-3">
            Your horse&apos;s size class appears when you enter a height.
          </span>
        )}
      </Flex>
    </div>
  );
};
