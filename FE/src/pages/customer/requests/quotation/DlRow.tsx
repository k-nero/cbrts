import type { FC } from 'react';

/** A label and its figure on one line of a side panel. */
export const DlRow: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="type-body-s text-ink-3">{label}</span>
    <span className="type-data text-ink">{value}</span>
  </div>
);
