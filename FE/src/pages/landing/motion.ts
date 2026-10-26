import type { Transition, Variants } from 'motion/react';

/*
 * The landing's motion: quiet and once. Things rise into place as they enter the view and then
 * hold still; nothing loops and nothing moves on its own after that. MotionConfig on the page
 * honours the visitor's reduced-motion setting, which keeps the fades and drops the travel.
 */

export const EASE_OUT: Transition['ease'] = [0.22, 1, 0.36, 1];

/** Animate the first time a block is a fifth into the view, never again. */
export const IN_VIEW = { once: true, amount: 0.2 } as const;

/*
 * Each variant takes an optional delay through `custom`. Left unset, the parent's stagger decides:
 * a variant's own delay would override it.
 */
const at = (delay?: number) => (delay === undefined ? {} : { delay });

/** A container that hands its children their turn, one after another. */
export const stagger = (gap = 0.08, delay = 0): Variants => ({
  hidden: {},
  shown: { transition: { staggerChildren: gap, delayChildren: delay } },
});

/** A block that rises a little and fades in. */
export const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  shown: (delay?: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT, ...at(delay) },
  }),
};

/** A line that draws itself from its start. */
export const draw: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  shown: (delay?: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.9, ease: EASE_OUT, ...at(delay) },
      opacity: { duration: 0.2, ...at(delay) },
    },
  }),
};

/** A marker that settles onto the map. */
export const pin: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  shown: (delay?: number) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.35, ease: EASE_OUT, ...at(delay) },
  }),
};

/** Plain fade, for labels that should not travel. */
export const fade: Variants = {
  hidden: { opacity: 0 },
  shown: (delay?: number) => ({ opacity: 1, transition: { duration: 0.5, ...at(delay) } }),
};
