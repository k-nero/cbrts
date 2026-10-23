import type { FC, ReactNode } from 'react';
import { Flex } from 'antd';

import { Panel } from '@/components/ui';
import type { RateCorridorView } from '@/interfaces';
import { policyRows } from '@/lib/utils';

/** Percentages and policy, with the fee bands read-only (they serve deposits and cancellation terms). */
export const PolicyPanel: FC<{ view: RateCorridorView; edit?: ReactNode }> = ({ view, edit }) => (
  <Panel title="Percentages and policy" extra={edit}>
    <Flex component="dl" vertical gap={8}>
      {policyRows(view.policies, view.feeBands).map((row) => (
        <Flex key={row.key} align="start" justify="space-between" gap={16}>
          <dt className="type-body-s text-ink-2">{row.label}</dt>
          <dd className="type-label-s m-0 text-right text-ink">{row.value}</dd>
        </Flex>
      ))}
    </Flex>
  </Panel>
);
