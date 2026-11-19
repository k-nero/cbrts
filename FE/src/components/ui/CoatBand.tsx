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

/** The coat as a colour value, for the fade from the coat under a horse's photo. */
export const COAT_VAR: Record<Coat, string> = {
  grey: 'var(--color-coat-grey)',
  black: 'var(--color-coat-black)',
  chestnut: 'var(--color-coat-chestnut)',
  bay: 'var(--color-coat-bay)',
  other: 'var(--color-muted)',
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
 * header (132 px, rounded). With the horse's own photo, the photo sits over the coat colour, which
 * fades out across the left half (solid, 80% at 22%, gone by 46%) so the nameplate stays on her
 * colour and her head reads on the right (DESIGN.md, Photography).
 */
export const CoatBand: FC<{
  coat: Coat;
  name: ReactNode;
  subtitle?: ReactNode;
  /** A blob URL of the horse's photo; without one the band is the flat coat colour. */
  photoUrl?: string;
  height?: number;
  className?: string;
}> = ({ coat, name, subtitle, photoUrl, height = 148, className }) => (
  <div className={cx('relative overflow-hidden', COAT_SWATCH[coat], className)} style={{ height }}>
    {photoUrl && (
      <>
        <img
          src={photoUrl}
          alt=""
          className="absolute inset-0 size-full object-cover object-[right_center]"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to right, ${COAT_VAR[coat]} 0%, color-mix(in srgb, ${COAT_VAR[coat]} 80%, transparent) 22%, transparent 46%)`,
          }}
        />
      </>
    )}
    <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent to-black/45" />
    <span className="type-mono-label absolute top-[18px] right-5 text-white/80">
      {COAT_LABEL[coat]}
    </span>
    <Nameplate name={name} subtitle={subtitle} className="absolute bottom-5 left-5" />
  </div>
);
