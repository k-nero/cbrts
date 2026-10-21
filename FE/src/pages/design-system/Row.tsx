import { FC, ReactNode } from 'react';

export const Row: FC<{ label?: string; children: ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-2.5">
    {label && <span className="type-body-s text-ink-3">{label}</span>}
    <div className="flex flex-wrap items-center gap-3">{children}</div>
  </div>
);
