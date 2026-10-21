import type { FC } from 'react';

import { cx } from './tone';

export const End: FC<{ city: string | null; placeholder: string; align: 'start' | 'end' }> = ({
  city,
  placeholder,
  align,
}) => (
  <span
    className={cx('flex min-w-0 flex-col gap-0.5', align === 'end' ? 'items-end text-right' : '')}
  >
    {city ? (
      <span className="type-h4 text-ink">{city}</span>
    ) : (
      <>
        <span className="type-data-l text-ink-3">···</span>
        <span className="type-body-s text-ink-3">{placeholder}</span>
      </>
    )}
  </span>
);
