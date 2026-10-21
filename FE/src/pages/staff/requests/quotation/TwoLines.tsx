import type { FC } from 'react';

/** A value said twice, right-aligned: "In 14 days" over "from issue". */
export const TwoLines: FC<{ line1: string; line2: string }> = ({ line1, line2 }) => (
  <span className="flex flex-col items-end gap-0.5">
    <span className="type-label-s text-ink">{line1}</span>
    <span className="type-caption text-ink-3">{line2}</span>
  </span>
);
