import type { FC, ReactNode } from 'react';

import { cx } from './tone';

type Props = { label: ReactNode; value: ReactNode; className?: string };

/**
 * A fact on a Deep Well cell: the label in sentence-case Body S (never uppercase mono), the value
 * in Mono Data because it is something you would copy.
 */
export const FactCell: FC<Props> = ({ label, value, className }) => (
  <div className={cx('flex min-w-0 flex-col gap-1 rounded-md bg-sunken px-2 py-2.5', className)}>
    <span className="type-body-s text-ink-3">{label}</span>
    <span className="type-data truncate text-ink">{value}</span>
  </div>
);
