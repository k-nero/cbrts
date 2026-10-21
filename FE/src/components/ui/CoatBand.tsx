import type { FC, ReactNode } from 'react';

import { Nameplate } from './Nameplate';
import { cx } from './tone';
import type { Coat } from './HorseCard';

/** The coat as a fill: the horse card band, and the 12 px swatch in horse lists. */
export const COAT_SWATCH: Record<Coat, string> = {
  grey: 'bg-coat-grey',
  black: 'bg-coat-black',
  chestnut: 'bg-coat-chestnut',
  bay: 'bg-coat-bay',
  other: 'bg-muted',
};

const COAT_LABEL: Record<Coat, string> = {
  grey: 'grey',
  black: 'black',
  chestnut: 'chestnut',
  bay: 'bay',
  other: 'other',
};

/**
 * The coat band with its brass nameplate on top, shared by the horse card (148 px) and the profile
 * header (132 px, rounded).
 */
export const CoatBand: FC<{
  coat: Coat;
  name: ReactNode;
  subtitle?: ReactNode;
  height?: number;
  className?: string;
}> = ({ coat, name, subtitle, height = 148, className }) => (
  <div className={cx('relative overflow-hidden', COAT_SWATCH[coat], className)} style={{ height }}>
    <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent to-black/45" />
    <span className="type-mono-label absolute top-[18px] right-5 text-white/80">
      {COAT_LABEL[coat]}
    </span>
    <Nameplate name={name} subtitle={subtitle} className="absolute bottom-5 left-5" />
  </div>
);
