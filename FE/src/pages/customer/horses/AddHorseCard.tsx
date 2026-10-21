import type { FC } from 'react';

import { Icon } from '@/components/ui';

/** The dashed card that closes the Active grid (frame: My horses). */
export const AddHorseCard: FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex min-h-[320px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line-strong bg-transparent p-8 text-center"
  >
    <span className="flex size-11 items-center justify-center rounded-full bg-muted text-ink-2">
      <Icon name="plus" size={22} />
    </span>
    <span className="type-h4 text-ink">Add a horse</span>
    <span className="type-body-s max-w-[260px] text-ink-3">
      Name, sex, size class and microchip are needed for quotes and border checks.
    </span>
  </button>
);
