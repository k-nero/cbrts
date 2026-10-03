import type { FC, ReactNode } from 'react';

import { Icon } from './Icon';
import { cx } from './tone';

export type StepState = 'upcoming' | 'current' | 'done';

type StepProps = { state: StepState; number: number; label: ReactNode };

/**
 * A request wizard step (DESIGN.md, Navigation). The current step's badge is gold; done steps are
 * green with a check, because they are facts, not the forward action.
 */
export const Step: FC<StepProps> = ({ state, number, label }) => (
  <span
    className="flex items-center gap-2.5"
    aria-current={state === 'current' ? 'step' : undefined}
  >
    <span
      className={cx(
        'grid size-7 shrink-0 place-items-center rounded-md border',
        state === 'current' && 'border-transparent bg-gold text-gold-on',
        state === 'done' && 'border-ok-line bg-ok-soft text-ok',
        state === 'upcoming' && 'border-line-strong text-ink-3',
      )}
    >
      {state === 'done' ? (
        <Icon name="check" size={16} />
      ) : (
        <span className="type-data">{number}</span>
      )}
    </span>
    <span
      className={cx(
        'type-label-s',
        state === 'current' ? 'text-ink' : state === 'done' ? 'text-ink-2' : 'text-ink-3',
      )}
    >
      {label}
    </span>
  </span>
);

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
