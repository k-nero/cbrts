import type { FC, ReactNode } from 'react';

import { HorseAvatar } from './HorseAvatar';
import type { Coat } from './HorseCard';
import { PLATE_GOLD, PlateShimmer } from './Nameplate';
import { cx } from './tone';

const SIZE = {
  md: { circle: 28, plate: 'px-[7px] py-px text-[13px] leading-5' },
  sm: { circle: 20, plate: 'px-1.5 text-[12px] leading-[18px]' },
} as const;

/**
 * A horse where the full coat band doesn't fit (a pass, a table, a list): her photo circle, or her
 * coat colour without one, beside her name on a mini gold plate that shimmers while hovered, like
 * the big nameplate (DESIGN.md, Horse tag).
 */
export const HorseTag: FC<{
  coat: Coat;
  name: ReactNode;
  /** A blob URL of the horse's photo. */
  photoUrl?: string;
  size?: keyof typeof SIZE;
  className?: string;
}> = ({ coat, name, photoUrl, size = 'md', className }) => (
  <span className={cx('group/horse inline-flex max-w-full items-center gap-1.5', className)}>
    <HorseAvatar coat={coat} photoUrl={photoUrl} size={SIZE[size].circle} />
    <span
      className={cx(
        'relative min-w-0 overflow-hidden rounded-[3px] font-display text-brass-ink shadow-brass',
        SIZE[size].plate,
      )}
      style={{ background: PLATE_GOLD }}
    >
      <PlateShimmer />
      <span className="relative block truncate">{name}</span>
    </span>
  </span>
);
