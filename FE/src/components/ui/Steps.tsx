import type { FC, ReactNode } from 'react';

import { Step } from './Step';

type StepsProps = { steps: ReactNode[]; /** 0-based index of the current step. */ current: number };

/** The wizard's step row, joined by hairlines. */
export const Steps: FC<StepsProps> = ({ steps, current }) => (
  <ol className="m-0 flex list-none items-center gap-4 p-0">
    {steps.map((label, i) => (
      <li key={i} className="flex items-center gap-4">
        {i > 0 && <span aria-hidden className="h-px w-8 bg-line-strong" />}
        <Step
          state={i < current ? 'done' : i === current ? 'current' : 'upcoming'}
          number={i + 1}
          label={label}
        />
      </li>
    ))}
  </ol>
);
