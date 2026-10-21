import { type FC, useState } from 'react';

import { RequestSummary } from '@/components/request/RequestSummary';
import { Tabs } from '@/components/ui';
import type { ReviewRevision } from '@/interfaces';
import { asSent, changedRows, formatDayTime, reviewRows } from '@/lib/utils';

/** What the customer sent, at a version; later versions mark what changed (spec §5.2). */
export const SentPanel: FC<{ revisions: ReviewRevision[] }> = ({ revisions }) => {
  const latest = revisions[revisions.length - 1]?.revisionNo ?? 0;
  const [shown, setShown] = useState(String(latest));
  const index = revisions.findIndex((v) => String(v.revisionNo) === shown);
  const version = revisions[index];
  if (!version) return null;
  const previous = index > 0 ? revisions[index - 1] : undefined;
  return (
    <RequestSummary
      title={`What the customer sent · v${version.revisionNo}`}
      rows={reviewRows(asSent(version.payload))}
      changed={changedRows(previous?.payload, version.payload)}
      extra={
        revisions.length > 1 && (
          <Tabs
            label="Versions"
            items={revisions.map((v) => ({ key: String(v.revisionNo), label: `v${v.revisionNo}` }))}
            activeKey={shown}
            onChange={setShown}
          />
        )
      }
      footer={
        version.note && (
          <div>
            <p className="type-label-s m-0 text-ink-2">
              Returned{version.returnedAt ? ` ${formatDayTime(version.returnedAt)}` : ''} with:
            </p>
            <p className="type-body-s m-0 mt-1 whitespace-pre-line text-ink">{version.note}</p>
          </div>
        )
      }
    />
  );
};
