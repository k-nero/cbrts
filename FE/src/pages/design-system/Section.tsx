import { FC, ReactNode } from 'react';

export const Section: FC<{ title: string; description: string; children: ReactNode }> = ({
  title,
  description,
  children,
}) => (
  <section className="flex flex-col gap-5 rounded-xl border border-line bg-card p-10">
    <div className="flex flex-col gap-2">
      <h2 className="type-display-m m-0 text-ink">{title}</h2>
      <p className="type-body-m m-0 max-w-225 text-ink-2">{description}</p>
    </div>
    {children}
  </section>
);
