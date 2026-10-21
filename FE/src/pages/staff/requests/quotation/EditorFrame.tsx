import type { FC, ReactNode } from 'react';

/** The sunken band an inline line editor sits in, under its line or at the foot of its group. */
export const EditorFrame: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <div className="flex flex-col gap-3 border-b border-line bg-sunken px-5 py-4">
    <span className="type-label-m text-ink">{title}</span>
    {children}
  </div>
);
