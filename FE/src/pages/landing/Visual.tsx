import type { FC, ReactNode } from 'react';

import { cx } from '@/components/ui';

/* Every visual is one height, so the feature titles line up (FEATURE_VISUAL_H). */
export const Visual: FC<{ children: ReactNode; label: string; className?: string }> = ({
  children,
  label,
  className,
}) => (
  <figure
    aria-label={label}
    className={cx('m-0 flex h-[132px] flex-col gap-2 rounded-md bg-sunken p-4', className)}
  >
    {children}
  </figure>
);
