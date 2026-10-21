import { type ReactNode } from 'react';

/** A tab whose content isn't built on this page yet. */
export const Placeholder = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="rounded-lg border border-line bg-card p-8 text-center">
    <h4 className="type-h4 text-ink">{title}</h4>
    <p className="type-body-s mt-1 text-ink-3">{children}</p>
  </div>
);
