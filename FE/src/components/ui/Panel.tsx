import type { FC, ReactNode } from 'react';

import { cx } from './tone';

type Props = {
  /** Heading H4 panel title; use Heading H3 content for a panel lead ("You owe 4 items"). */
  title?: ReactNode;
  /** Right side of the head: a count, a chip, a Ghost link. */
  extra?: ReactNode;
  /** A Deep Well strip at the foot. */
  footer?: ReactNode;
  /** Rows inside separate with hairlines and set their own padding. */
  flush?: boolean;
  children?: ReactNode;
  className?: string;
};

/**
 * A flat bordered panel (DESIGN.md, Cards / Containers): Card Navy, 1 px Hairline, 12 px corners,
 * 24 px padding, no shadow.
 */
export const Panel: FC<Props> = ({ title, extra, footer, flush, children, className }) => (
  <section className={cx('overflow-hidden rounded-lg border border-line bg-card', className)}>
    {Boolean(title || extra) && (
      <header
        className={cx(
          'flex items-center justify-between gap-4 px-6 pt-5',
          flush && 'border-b border-line pb-4',
        )}
      >
        {typeof title === 'string' ? <h2 className="type-h4 m-0 text-ink">{title}</h2> : title}
        {extra}
      </header>
    )}
    <div className={flush ? undefined : cx('p-6', Boolean(title || extra) && 'pt-4')}>
      {children}
    </div>
    {footer && <footer className="border-t border-line bg-sunken px-6 py-3.5">{footer}</footer>}
  </section>
);
