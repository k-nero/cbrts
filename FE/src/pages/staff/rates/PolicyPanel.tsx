import type { FC, ReactNode } from 'react';

import { Panel } from '@/components/ui';
import type { RateCorridorView } from '@/interfaces';
import { policyRows } from '@/lib/utils';

/** Percentages and policy, with the fee bands read-only (they serve deposits and cancellation terms). */
export const PolicyPanel: FC<{ view: RateCorridorView; edit?: ReactNode }> = ({ view, edit }) => (
  <Panel title="Percentages and policy" extra={edit}>
    <dl className="m-0 flex flex-col gap-2">
      {policyRows(view.policies, view.feeBands).map((row) => (
        <div key={row.key} className="flex items-start justify-between gap-4">
          <dt className="type-body-s text-ink-2">{row.label}</dt>
          <dd className="type-label-s m-0 text-right text-ink">{row.value}</dd>
        </div>
      ))}
    </dl>
  </Panel>
);
