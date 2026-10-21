import type { FC } from 'react';

import { Icon } from './Icon';
import { cx } from './tone';

/*
 * A checked box or selected radio is a strong neutral (Paper Ink) on every surface: gold stays for
 * the one action, green for facts that are done (DESIGN.md, Checkbox).
 */

/** The box alone, for controlled indicators such as the one inside Option card. */
export const CheckMark: FC<{ checked: boolean; className?: string }> = ({ checked, className }) => (
  <span
    aria-hidden
    className={cx(
      'grid size-[18px] shrink-0 place-items-center rounded-sm border',
      checked ? 'border-ink bg-ink text-canvas' : 'border-line-strong bg-input text-transparent',
      className,
    )}
  >
    <Icon name="check" size={14} strokeWidth={2.25} />
  </span>
);
