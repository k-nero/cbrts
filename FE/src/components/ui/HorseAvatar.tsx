import type { FC } from 'react';

import { COAT_SWATCH } from './CoatBand';
import { cx } from './tone';
import type { Coat } from './HorseCard';

/**
 * A horse in a list or a pick card: her photo in a circle, or her coat colour without one (DESIGN.md,
 * Request · Horses step). Decoration beside her name, so hidden from screen readers.
 */
export const HorseAvatar: FC<{
  coat: Coat;
  /** A blob URL of the horse's photo. */
  photoUrl?: string;
  /** Diameter in px. */
  size: number;
  className?: string;
}> = ({ coat, photoUrl, size, className }) =>
  photoUrl ? (
    <img
      src={photoUrl}
      alt=""
      aria-hidden
      className={cx(
        'shrink-0 rounded-full border border-line-strong object-cover object-[right_center]',
        className,
      )}
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden
      className={cx(
        'shrink-0 rounded-full border border-line-strong',
        COAT_SWATCH[coat],
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
