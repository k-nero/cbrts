import type { FC } from 'react';

import { Chip, Panel } from '@/components/ui';
import type { RateVersion } from '@/interfaces';
import { formatDate, formatDayTime } from '@/lib/utils';

const describe = (v: RateVersion): string => {
  if (v.status === 'DRAFT') {
    return v.lastEditedBy && v.updatedAt
      ? `Edited by ${v.lastEditedBy}, ${formatDayTime(v.updatedAt)}`
      : 'Not edited yet';
  }
  const published = v.publishedAt ? `Published ${formatDate(v.publishedAt)}` : 'Published';
  const pinned = `${v.quotationsPinned} ${v.quotationsPinned === 1 ? 'quotation' : 'quotations'} pinned`;
  return `${published} · ${pinned}`;
};

/** Every catalog version, newest first; quotations keep the version they pinned. */
export const VersionsPanel: FC<{ versions: RateVersion[] }> = ({ versions }) => (
  <Panel title="Versions" flush>
    {versions.length === 0 && (
      <p className="type-body-s m-0 px-6 py-3 text-ink-2">No version has been published yet.</p>
    )}
    <ul className="m-0 list-none p-0">
      {versions.map((v, i) => (
        <li
          key={v.id}
          className={`flex items-start gap-3 px-6 py-3 ${i > 0 ? 'border-t border-line' : ''}`}
        >
          <span
            className={`type-data w-9 shrink-0 ${v.status === 'RETIRED' ? 'text-ink-3' : 'text-ink'}`}
          >
            {`v${v.versionNo}`}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="type-body-s text-ink-2">{describe(v)}</span>
            {v.changeNote && <span className="type-body-s text-ink-3">{v.changeNote}</span>}
          </span>
          {v.status === 'DRAFT' && <Chip tone="warn">Draft</Chip>}
          {v.status === 'PUBLISHED' && <Chip tone="info">Current</Chip>}
        </li>
      ))}
    </ul>
  </Panel>
);
