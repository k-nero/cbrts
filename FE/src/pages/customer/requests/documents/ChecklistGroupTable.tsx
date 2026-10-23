import type { FC } from 'react';

import { cx, Deadline, DocumentRow } from '@/components/ui';
import { ChecklistStatusEnum } from '@/interfaces';
import {
  type ChecklistGroup,
  customerHolder,
  formatDate,
  isOverdue,
  isOwedByCustomer,
  itemDeadline,
  rowStatus,
  rowStatusLabel,
} from '@/lib/utils';

type Props = { group: ChecklistGroup; now: string };

/** One horse's documents, or the shipment's, under a head counting "n of m cleared". */
const ChecklistGroupTable: FC<Props> = ({ group, now }) => (
  <section aria-label={group.title} className="border-t border-line first:border-t-0">
    {/* A plain div: AntD's Flex resets padding over Tailwind's. */}
    <div className="flex items-center justify-between border-b border-line bg-sunken px-5 py-3">
      <span className="flex items-baseline gap-2.5">
        <h3 className="type-h4 m-0 text-ink">{group.title}</h3>
        {group.subtitle && <span className="type-caption text-ink-3">{group.subtitle}</span>}
      </span>
      <span className="type-caption text-ink-3">
        {group.cleared} of {group.total} cleared
      </span>
    </div>
    {group.items.map((item) => {
      const deadline = itemDeadline(item, now);
      const version = item.currentVersion;
      const rejected = item.status === ChecklistStatusEnum.REJECTED && version?.rejectReason;
      return (
        <DocumentRow
          key={item.id}
          // Overdue rows are tinted so they stand out in a long list, not only by their red date.
          className={cx(isOverdue(item, now) && 'bg-bad-soft!')}
          status={rowStatus(item)}
          statusLabel={rowStatusLabel(item)}
          document={item.documentTypeName || item.documentTypeCode}
          rule={item.ruleDescription}
          result={
            rejected
              ? `Rejected${version.reviewedAt ? ` ${formatDate(version.reviewedAt)}` : ''}${
                  version.reviewedByCalledName ? ` by ${version.reviewedByCalledName}` : ''
                }: ${version.rejectReason}`
              : item.validityNote
          }
          holder={
            <span className={cx(isOwedByCustomer(item) ? 'text-ink' : 'text-ink-2')}>
              {customerHolder(item)}
            </span>
          }
          version={<Deadline left={deadline.left} date={deadline.date} tone={deadline.tone} />}
        />
      );
    })}
  </section>
);

export default ChecklistGroupTable;
