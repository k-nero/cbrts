import type { FC, ReactNode } from 'react';

import { Icon } from './Icon';
import { cx } from './tone';

type Props = { tone?: 'ok' | 'bad'; children: ReactNode; className?: string };

/** A confirmation that floats (DESIGN.md, Toast): Lifted Navy with the overlay shadow. */
export const Toast: FC<Props> = ({ tone = 'ok', children, className }) => (
  <div
    role={tone === 'bad' ? 'alert' : 'status'}
    className={cx(
      'flex w-fit items-center gap-2.5 rounded-md border border-line-strong bg-raised px-4 py-3 shadow-overlay',
      className,
    )}
  >
    <Icon
      name={tone === 'ok' ? 'check' : 'alert'}
      size={18}
      className={tone === 'ok' ? 'text-ok' : 'text-bad'}
    />
    <span className="type-body-s text-ink">{children}</span>
  </div>
);
