import type { FC, ReactNode } from 'react';

import { cx } from '@/components/ui';

/** A fact: its label, its value, and whether the value is a figure (DM Mono). */
export type Fact = { label: string; value: ReactNode; mono?: boolean };

/** Facts in a two-column grid, each row under a hairline (frame: Horse profile, What she needs). */
export const FactGrid: FC<{ facts: Fact[] }> = ({ facts }) => (
  <dl className="m-0 grid grid-cols-2 gap-x-8">
    {facts.map((fact) => (
      <div key={fact.label} className="flex flex-col gap-0.5 border-t border-line py-2.5">
        <dt className="type-body-s text-ink-3">{fact.label}</dt>
        <dd className={cx('m-0 text-ink', fact.mono ? 'type-data' : 'type-label-s')}>
          {fact.value}
        </dd>
      </div>
    ))}
  </dl>
);
