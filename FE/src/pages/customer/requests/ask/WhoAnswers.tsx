import type { FC } from 'react';
import { Flex } from 'antd';

import { Panel } from '@/components/ui';

const ROWS: [string, string][] = [
  ['Documents', 'Transport specialist'],
  ['Dates, price or changes', 'Logistics manager'],
  ['The trip', 'Fleet & route coordinator'],
];

/** Who answers what (Figma, Tracking · Ask a question): the routing, said before anything is sent. */
export const WhoAnswers: FC = () => (
  <Panel title="Who answers what">
    <Flex vertical gap={10}>
      {ROWS.map(([topic, who]) => (
        <Flex key={topic} justify="space-between" gap={16}>
          <span className="type-body-s text-ink-2">{topic}</span>
          <span className="type-label-s text-right text-ink">{who}</span>
        </Flex>
      ))}
      <p className="type-body-s m-0 pt-2 text-ink-3">
        Replies within 1 business day. Urgent on the day of travel? Call the number on your trip
        page.
      </p>
    </Flex>
  </Panel>
);
