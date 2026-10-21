import type { FC, ReactNode } from 'react';

/** A label and its value across a side panel: "Total  $8,757.40". */
export const PanelRow: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="type-body-s text-ink-2">{label}</span>
    {children}
  </div>
);
