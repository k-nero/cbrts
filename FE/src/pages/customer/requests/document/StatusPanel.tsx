import type { FC } from 'react';

import { Chip, Deadline, DOCUMENT_STATUS, Panel } from '@/components/ui';
import { type ChecklistItem, ChecklistStatusEnum } from '@/interfaces';
import {
  customerHolder,
  formatDate,
  type ItemDeadline,
  rowStatus,
  rowStatusLabel,
} from '@/lib/utils';

/** What the customer is told about where the document is now, and what happens next. */
function statusLine(item: ChecklistItem): string {
  const version = item.currentVersion;
  if (item.status === ChecklistStatusEnum.REJECTED && version?.rejectReason)
    return `${version.reviewedByCalledName ?? 'Your transport specialist'} rejected v${version.versionNo}: ${version.rejectReason}`;
  if (item.status === ChecklistStatusEnum.CLEARED)
    return 'Cleared. Nothing more is needed from you.';
  if (item.status === ChecklistStatusEnum.IN_REVIEW)
    return `Nothing more is needed from you for now. Your transport specialist reviews v${version?.versionNo ?? 1}; only a document they approve counts toward clearance.`;
  return item.validityNote || 'Not uploaded yet. Upload it with the dates printed on it.';
}

/** Where this document stands: its state, the deadline said twice, the current version and who holds it. */
export const StatusPanel: FC<{ item: ChecklistItem; deadline: ItemDeadline }> = ({
  item,
  deadline,
}) => {
  const status = DOCUMENT_STATUS[rowStatus(item)];
  const version = item.currentVersion;
  return (
    <Panel>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col items-start gap-2.5">
          <h2 className="type-h4 m-0 text-ink">Where this document stands</h2>
          <Chip tone={status.tone}>{rowStatusLabel(item) ?? status.label}</Chip>
        </div>
        <p className="type-body-s m-0 text-ink-2">{statusLine(item)}</p>
        <dl className="m-0 flex flex-col">
          <div className="flex items-center justify-between gap-4 border-t border-line py-2.5">
            <dt className="type-body-s text-ink-2">Your deadline</dt>
            <dd className="m-0">
              <Deadline left={deadline.left} date={deadline.date} tone={deadline.tone} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-line py-2.5">
            <dt className="type-body-s text-ink-2">Current version</dt>
            <dd className="type-data m-0 text-ink">
              {version ? `v${version.versionNo} · ${formatDate(version.uploadedAt)}` : 'None yet'}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-line py-2.5">
            <dt className="type-body-s text-ink-2">With</dt>
            <dd className="type-label-s m-0 text-ink">{customerHolder(item)}</dd>
          </div>
        </dl>
      </div>
    </Panel>
  );
};
