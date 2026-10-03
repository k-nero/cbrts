import type { FC, ReactNode } from 'react';

import { cx, Tone, TONE_DOT, TONE_FG, TONE_SURFACE } from './tone';

type Props = {
  tone?: Tone;
  children: ReactNode;
  /** Certainty tags on quote lines drop the dot. */
  dot?: boolean;
  className?: string;
};

/**
 * State as a tone plus a word (DESIGN.md, Chips): pill, tinted fill and border, a 6 px dot and an
 * uppercase Mono Chip label. There is no gold chip, and a stage is words, not a chip (StageMark).
 */
export const Chip: FC<Props> = ({ tone = 'neutral', dot = true, children, className }) => (
  <span
    className={cx(
      'type-chip inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-[9px] py-[5px]',
      'whitespace-nowrap',
      TONE_SURFACE[tone],
      TONE_FG[tone],
      className,
    )}
  >
    {dot && <span aria-hidden className={cx('size-1.5 shrink-0 rounded-full', TONE_DOT[tone])} />}
    {children}
  </span>
);
