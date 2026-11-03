import type { FC } from 'react';

import { Panel } from '@/components/ui';
import type { TripRecord } from '@/interfaces';
import { formatTime } from '@/lib/utils';

/** A record quoted verbatim, with its time and author, from the one stored record. */
export const QuotedRecordPanel: FC<{ title: string; record: TripRecord; fallback: string }> = ({
  title,
  record,
  fallback,
}) => (
  <Panel title={title}>
    <div className="flex flex-col gap-1.5">
      <p className="type-body-s m-0 text-ink">{record.text ? `“${record.text}”` : fallback}</p>
      <p className="type-body-s m-0 text-ink-3">
        {formatTime(record.occurredAt)}
        {record.recordedBy ? ` · ${record.recordedBy}` : ''}
      </p>
    </div>
  </Panel>
);
