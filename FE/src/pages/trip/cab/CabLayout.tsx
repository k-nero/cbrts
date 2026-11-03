import type { FC, ReactNode } from 'react';

type Props = {
  task: ReactNode;
  side: ReactNode;
  /** Full width under both: the emergency report. */
  extra?: ReactNode;
  dock: ReactNode;
};

/** The task on the left, what helps with it on the right, the dock under both. */
export const CabLayout: FC<Props> = ({ task, side, extra, dock }) => (
  <>
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex min-w-0 flex-col gap-5">{task}</div>
      <aside className="flex flex-col gap-6">{side}</aside>
    </div>
    {extra}
    {dock}
  </>
);
