import type { FC } from 'react';
import { Flex } from 'antd';
import { Chip, Panel } from '@/components/ui';
import { type DocumentVersion, DocumentReviewEnum } from '@/interfaces';

type Props = {
  currentVersionId: string;
  versions: DocumentVersion[];
};

const uploadedOn = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Versions history panel (Figma: versionsPanel).
 * Displays all versions uploaded for this checklist item.
 */
export const VersionsPanel: FC<Props> = ({ currentVersionId, versions }) => (
  <Panel
    title="Versions"
    extra={
      <span className="type-caption text-ink-3">
        {versions.length} {versions.length === 1 ? 'version' : 'versions'}
      </span>
    }
    footer={
      <span className="type-caption text-ink-3">
        The customer sees the same list. Approving or rejecting is added to both histories.
      </span>
    }
  >
    <Flex vertical gap={12}>
      {versions.map((ver) => {
        const isCurrent = ver.id === currentVersionId;
        const [tone, label] =
          ver.review === DocumentReviewEnum.APPROVED
            ? (['ok', 'Approved'] as const)
            : ver.review === DocumentReviewEnum.REJECTED
              ? (['bad', 'Rejected'] as const)
              : isCurrent
                ? (['info', 'In review'] as const)
                : (['neutral', 'Replaced'] as const);

        return (
          <Flex key={ver.id} justify="space-between" align="center" gap={12}>
            <Flex vertical gap={2}>
              <Flex align="center" gap={8}>
                <span className="type-label-s text-ink">v{ver.versionNo}</span>
                {ver.uploadedAt && (
                  <span className="type-caption text-ink-3">{uploadedOn(ver.uploadedAt)}</span>
                )}
              </Flex>
              <span className="type-caption text-ink-2">
                {ver.fileName || 'Document upload'}
                {isCurrent ? ' · This version' : ''}
              </span>
              {ver.rejectReason && (
                <span className="type-caption text-bad">Reason: {ver.rejectReason}</span>
              )}
            </Flex>
            <Chip tone={tone}>{label}</Chip>
          </Flex>
        );
      })}
    </Flex>
  </Panel>
);
