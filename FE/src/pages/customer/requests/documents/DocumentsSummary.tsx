import type { FC } from 'react';
import { Flex } from 'antd';

import { Panel, Progress } from '@/components/ui';
import type { ChecklistItem } from '@/interfaces';
import { isCleared, isOverdue, isOwedByCustomer, isWithAuthority } from '@/lib/utils';

type Props = { items: ChecklistItem[]; now: string };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "All 23 documents", what they are, and the bar of how many are cleared (DESIGN.md, All documents). */
const DocumentsSummary: FC<Props> = ({ items, now }) => {
  const cleared = items.filter(isCleared).length;
  const owed = items.filter(isOwedByCustomer).length;
  const authorities = items.filter(isWithAuthority).length;
  const overdue = items.filter((item) => isOverdue(item, now)).length;

  return (
    <Panel>
      <Flex vertical gap={12}>
        <h2 className="type-h3 m-0 text-ink">All {plural(items.length, 'document')}</h2>
        <Flex justify="space-between" align="end" gap={24}>
          <p className="type-body-s m-0 max-w-[640px] text-ink-2">
            One row per horse and document, plus the shipment’s own papers. Each is checked against
            your travel dates, and only cleared documents open the departure gate.
            {overdue > 0 && (
              <span className="text-bad">
                {' '}
                {overdue === 1 ? 'One is overdue.' : `${overdue} are overdue.`}
              </span>
            )}
          </p>
          <span className="type-caption shrink-0 text-ink-2">
            {cleared} cleared · {owed} with you · {authorities} with the authorities
          </span>
        </Flex>
        <Progress
          tone="ok"
          value={items.length ? (cleared / items.length) * 100 : 0}
          label={`${cleared} of ${items.length} documents cleared`}
        />
      </Flex>
    </Panel>
  );
};

export default DocumentsSummary;
