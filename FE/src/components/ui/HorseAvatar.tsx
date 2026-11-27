import type { FC } from 'react';
import { motion } from 'motion/react';

import { COAT_SWATCH } from './CoatBand';
import { cx } from './tone';
import type { Coat } from './HorseCard';

import { fade } from '@/lib/motion';

/**
 * A horse in a list or a pick card: her photo in a circle, or her coat colour without one (DESIGN.md,
 * Request · Horses step). Decoration beside her name, so hidden from screen readers.
 *
 * The coat colour is always the circle's base. The photo arrives after the page (a blob fetched by
 * id), so it fades in over the coat instead of snapping in, and a coat looked up late eases to its
 * colour (lib/motion: quiet and once).
 */
export const HorseAvatar: FC<{
  coat: Coat;
  /** A blob URL of the horse's photo. */
  photoUrl?: string;
  /** Diameter in px. */
  size: number;
  className?: string;
}> = ({ coat, photoUrl, size, className }) => (
  <span
    aria-hidden
    className={cx(
      // inline-block: the size holds outside a flex row too (the pass wraps it in a plain span).
      'relative inline-block shrink-0 overflow-hidden rounded-full border border-line-strong',
      'transition-colors duration-300 motion-reduce:transition-none',
      COAT_SWATCH[coat],
      className,
    )}
    style={{ width: size, height: size }}
  >
    {photoUrl && (
      <motion.img
        key={photoUrl}
        src={photoUrl}
        alt=""
        variants={fade}
        initial="hidden"
        animate="shown"
        className="absolute inset-0 size-full object-cover object-[right_center]"
      />
    )}
  </span>
);
