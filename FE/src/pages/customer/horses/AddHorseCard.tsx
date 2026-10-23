import type { FC } from 'react';
import { Flex } from 'antd';

import { Icon } from '@/components/ui';

/** The dashed card that closes the Active grid (frame: My horses). */
export const AddHorseCard: FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="min-h-[320px] w-full cursor-pointer rounded-lg border border-dashed border-line-strong bg-transparent p-8 text-center"
  >
    <Flex component="span" vertical align="center" justify="center" gap={12} className="min-h-64">
      <Flex
        component="span"
        align="center"
        justify="center"
        className="size-11 rounded-full bg-muted text-ink-2"
      >
        <Icon name="plus" size={22} />
      </Flex>
      <span className="type-h4 text-ink">Add a horse</span>
      <span className="type-body-s max-w-[260px] text-ink-3">
        Name, sex, size class and microchip are needed for quotes and border checks.
      </span>
    </Flex>
  </button>
);
