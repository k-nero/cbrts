import { Flex } from 'antd';
import type { FC } from 'react';

import { Panel } from '@/components/ui';
import type { HistoryEntry } from '@/interfaces';
import { formatDayTime } from '@/lib/utils';

/** The request's audit trail, newest first. */
export const HistoryPanel: FC<{ history: HistoryEntry[] }> = ({ history }) => (
  <Panel title="History" flush>
    <ol className="m-0 list-none p-0">
      {history.map((h, i) => (
        <li
          key={`${h.occurredAt}-${i}`}
          className={`grid grid-cols-[120px_minmax(0,1fr)] gap-4 px-6 py-3 ${i > 0 ? 'border-t border-line' : ''}`}
        >
          <span className="type-caption pt-0.5 text-ink-3">{formatDayTime(h.occurredAt)}</span>
          <Flex component="span" vertical gap={2}>
            <span className="type-body-s text-ink">{h.summary}</span>
            <span className="type-body-s text-ink-3">{h.actorLabel}</span>
          </Flex>
        </li>
      ))}
    </ol>
  </Panel>
);
