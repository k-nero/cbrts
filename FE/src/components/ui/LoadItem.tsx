import type { ComponentPropsWithRef, FC, ReactNode } from 'react';

import { Icon } from './Icon';
import { cx } from './tone';

type Props = Omit<ComponentPropsWithRef<'button'>, 'children'> & {
  horse: ReactNode;
  /** "Mare · 445 kg · Lipizzan". */
  meta?: ReactNode;
  /** A temperament chip. */
  tag?: ReactNode;
  selected?: boolean;
};

/**
 * A horse waiting to be placed on the load plan. Drag it, or select it and choose a stall (the
 * keyboard path). Selected takes the gold focus border because it marks where the next drop goes.
 */
export const LoadItem: FC<Props> = ({ horse, meta, tag, selected, className, ...rest }) => (
  <button
    type="button"
    aria-pressed={selected}
    className={cx(
      'focus-ring flex w-full cursor-pointer flex-col gap-2 rounded-md px-4 py-3.5 text-left',
      selected
        ? 'border-[1.5px] border-gold bg-raised'
        : 'border border-line bg-card hover:border-line-strong',
      className,
    )}
    {...rest}
  >
    <span className="flex w-full items-center gap-2.5">
      <Icon name="grip" size={16} className="text-ink-3" />
      <span className="type-h4 flex-1 text-ink">{horse}</span>
      {tag}
    </span>
    {meta && <span className="type-caption text-ink-3">{meta}</span>}
  </button>
);
