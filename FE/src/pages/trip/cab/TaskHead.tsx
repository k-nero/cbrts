import type { FC, ReactNode } from 'react';

/** The task's name in Display M and what it asks for, at the top of the task panel. */
export const TaskHead: FC<{ title: ReactNode; sub: ReactNode; extra?: ReactNode }> = ({
  title,
  sub,
  extra,
}) => (
  <header className="flex items-start justify-between gap-4 px-6 pt-[22px] pb-[18px]">
    <div className="flex flex-col gap-1.5">
      <h2 className="type-display-m m-0 text-ink">{title}</h2>
      <p className="type-body-m m-0 text-ink-2">{sub}</p>
    </div>
    {extra}
  </header>
);
