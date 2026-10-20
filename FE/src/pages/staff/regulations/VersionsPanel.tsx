import type { FC } from 'react';
import { Chip, Panel } from '@/components/ui';
import type { RegulationCatalog } from '@/interfaces';

const publishedOn = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'earlier';

/** The catalog's versions: the draft, the current one, then older ones. */
const VersionsPanel: FC<{ catalog?: RegulationCatalog }> = ({ catalog }) => (
  <Panel title={`Versions · ${catalog?.name?.replace(' import', '') ?? 'Cambodia'}`}>
    <div className="flex flex-col divide-y divide-line">
      {catalog?.draftVersion && (
        <div className="flex flex-col gap-1 py-3">
          <div className="flex items-center gap-2">
            <span className="type-mono font-bold text-ink">v{catalog.draftVersion.versionNo}</span>
            <Chip tone="warn" dot={false} className="px-1.5 py-0 text-[11px]">
              Draft
            </Chip>
          </div>
          <span className="type-body-s text-ink-3">
            {/* FIXME(mock): the editor and time are Figma placeholders, not the draft's real edit. */}
            {catalog.draftVersion.changesCount ?? 3} changes · edited by Nguyễn Thị Lan today, 10:40
          </span>
        </div>
      )}

      {catalog?.activeVersion && (
        <div className="flex flex-col gap-1 py-3">
          <div className="flex items-center gap-2">
            <span className="type-mono font-bold text-ink">v{catalog.activeVersion.versionNo}</span>
            <Chip tone="info" dot={false} className="px-1.5 py-0 text-[11px]">
              Current
            </Chip>
          </div>
          <span className="type-body-s text-ink-3">
            {/* FIXME(mock): the date is a Figma placeholder; the version has publishedAt. */}
            Published 22 Sep 2026 · {catalog.activeVersion.pinnedJobsCount ?? 3} jobs pinned
          </span>
        </div>
      )}

      {catalog?.versions
        ?.filter((v) => v.id !== catalog.activeVersion?.id && v.id !== catalog.draftVersion?.id)
        .map((v) => (
          <div key={v.id} className="flex flex-col gap-1 py-3">
            <div className="flex items-center gap-2">
              <span className="type-mono font-medium text-ink-2">v{v.versionNo}</span>
            </div>
            <span className="type-body-s text-ink-3">
              {`Published ${publishedOn(v.publishedAt)}${v.pinnedJobsCount ? ` · ${v.pinnedJobsCount} jobs pinned` : ' · archived'}`}
            </span>
          </div>
        ))}
    </div>
  </Panel>
);

export default VersionsPanel;
