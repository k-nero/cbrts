import type { FC, ReactNode } from 'react';

export const Section: FC<{ id: string; title: string; summary?: string; children: ReactNode }> = ({
  id,
  title,
  summary,
  children,
}) => (
  <section aria-labelledby={id} className="flex scroll-mt-6 flex-col gap-8 pt-20">
    <header className="flex flex-col gap-2.5">
      <h2 id={id} className="type-display-l m-0 text-ink">
        {title}
      </h2>
      {summary && <p className="type-body-m m-0 max-w-[680px] text-ink-2">{summary}</p>}
    </header>
    {children}
  </section>
);
