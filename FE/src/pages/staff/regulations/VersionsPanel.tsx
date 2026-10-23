import type { FC } from 'react';
import { Flex } from 'antd';
import { Chip, Panel } from '@/components/ui';
import { CatalogStatusEnum, type RegulationCatalog, type RegulationVersion } from '@/interfaces';
import { formatDay } from './constants';

/** "Published 22 Sep 2026 by Nguyễn Thị Lan · 3 jobs pinned", from the version's own record. */
const publishedLine = (version: RegulationVersion) => {
  const day = formatDay(version.publishedAt);
  const published = day
    ? `Published ${day}${version.publishedByName ? ` by ${version.publishedByName}` : ''}`
    : 'Not published';
  const pinned = version.pinnedJobsCount
    ? `${version.pinnedJobsCount} ${version.pinnedJobsCount === 1 ? 'job' : 'jobs'} pinned`
    : 'no jobs pinned';
  return `${published} · ${pinned}`;
};

/** The catalog's versions, newest first: the draft, the current one, then retired ones. */
const VersionsPanel: FC<{ catalog: RegulationCatalog }> = ({ catalog }) => {
  const versions = [...(catalog.versions ?? [])].sort((a, b) => b.versionNo - a.versionNo);
  return (
    <Panel title={`Versions · ${catalog.name.replace(' import', '')}`} className="h-full">
      <Flex vertical className="divide-y divide-line">
        {versions.map((version) => (
          <div key={version.id} className="py-3">
            <Flex vertical gap={4}>
              <Flex align="center" gap={8}>
                <span className="type-mono font-bold text-ink">v{version.versionNo}</span>
                {version.status === CatalogStatusEnum.DRAFT && (
                  <Chip tone="warn" dot={false}>
                    Draft
                  </Chip>
                )}
                {version.id === catalog.activeVersion?.id && (
                  <Chip tone="info" dot={false}>
                    Current
                  </Chip>
                )}
              </Flex>
              <span className="type-body-s text-ink-3">
                {version.status === CatalogStatusEnum.DRAFT
                  ? 'Not published yet'
                  : publishedLine(version)}
              </span>
            </Flex>
          </div>
        ))}
        {versions.length === 0 && (
          <span className="type-body-s py-3 text-ink-3">No versions yet.</span>
        )}
      </Flex>
    </Panel>
  );
};

export default VersionsPanel;
