import type { FC } from 'react';

import { cx } from '@/components/ui';

export const PassEnd: FC<{ code: string; city: string; end?: boolean }> = ({ code, city, end }) => (
  <span className={cx('flex shrink-0 flex-col gap-0.5', end && 'items-end text-right')}>
    <span className="type-data-l text-ink">{code}</span>
    <span className="type-body-s text-ink-2">{city}</span>
  </span>
);
