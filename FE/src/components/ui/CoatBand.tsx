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
 * The coat band with its gold nameplate on top, shared by the horse card (148 px) and the profile
 * header (132 px, rounded): the coat colour with a racing saddle cloth across the right, a darker
 * panel of the same coat edged with a gold pinstripe. A horse's photo is a circle beside it
 * (HorseAvatar), never part of the band. Hovering the band (or the card around it) sets the
 * nameplate's shimmer going.
 */
export const CoatBand: FC<{
  coat: Coat;
  name: ReactNode;
  subtitle?: ReactNode;
  height?: number;
  className?: string;
}> = ({ coat, name, subtitle, height = 148, className }) => (
  <div
    className={cx('group/horse relative overflow-hidden', COAT_SWATCH[coat], className)}
    style={{ height }}
  >
    <div
      aria-hidden
      className="absolute inset-y-0 -right-5 w-[46%] -skew-x-[14deg] border-l-2 border-brass-light bg-black/35"
    />
    <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent to-black/45" />
    <span className="type-mono-label absolute top-[18px] right-5 text-white/80">
      {COAT_LABEL[coat]}
    </span>
    <Nameplate name={name} subtitle={subtitle} className="absolute bottom-5 left-5" />
  </div>
);
