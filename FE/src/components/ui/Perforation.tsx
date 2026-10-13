import type { FC } from 'react';

import { cx } from './tone';

type Props = {
  /** A pass tears top to bottom between its body and stub; a draft pass tears across. */
  direction?: 'vertical' | 'horizontal';
  /** Space between the 3 px holes. */
  gap?: number;
  /** Space left clear at each end of the tear. */
  inset?: number;
  className?: string;
};

/**
 * The tear line between a pass and its stub (03-pages.js, travelPass): a row of 3 px Strong
 * Border holes. Drawn as a repeating background, so it runs the length of whatever it sits in.
 */
export const Perforation: FC<Props> = ({
  direction = 'vertical',
  gap = 8,
  inset = 10,
  className,
}) => {
  const vertical = direction === 'vertical';
  const period = 3 + gap;
  return (
    <span
      aria-hidden
      className={cx('shrink-0 self-stretch', vertical ? 'w-1' : 'h-3', className)}
      style={vertical ? { paddingBlock: inset } : { paddingInline: inset }}
    >
      <span
        className="block size-full"
        style={{
          backgroundImage:
            'radial-gradient(circle, var(--color-line-strong) 1.5px, transparent 1.75px)',
          backgroundSize: vertical ? `4px ${period}px` : `${period}px 12px`,
          backgroundRepeat: vertical ? 'repeat-y' : 'repeat-x',
          backgroundPosition: 'center',
        }}
      />
    </span>
  );
};
