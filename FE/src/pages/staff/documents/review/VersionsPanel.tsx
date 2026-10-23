import type { FC } from 'react';
import { Chip } from '@/components/ui';
import type { DocumentVersion } from '@/interfaces';

type Props = {
  currentVersionId: string;
  versions: DocumentVersion[];
};

/**
 * Versions history panel (Figma: versionsPanel).
 * Displays all versions uploaded for this checklist item.
 */
export const VersionsPanel: FC<Props> = ({ currentVersionId, versions }) => {
  return (
    <div className="rounded-lg border border-line bg-card p-5">
      <div className="flex items-center justify-between pb-3">
        <h4 className="type-h4 text-ink">Versions</h4>
        <span className="type-caption text-ink-3">
          {versions.length} {versions.length === 1 ? 'version' : 'versions'}
        </span>
      </div>

      <div className="divide-y divide-line">
        {versions.map((ver) => {
          const isCurrent = ver.id === currentVersionId;
          const status = ver.review;
          const tone =
            status === 'APPROVED'
              ? 'ok'
              : status === 'REJECTED'
                ? 'bad'
                : isCurrent
                  ? 'info'
                  : 'neutral';
          const label =
            status === 'APPROVED'
              ? 'Approved'
              : status === 'REJECTED'
                ? 'Rejected'
                : isCurrent
                  ? 'In review'
                  : 'Replaced';

          return (
            <div key={ver.id} className="flex items-center justify-between py-2.5">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="type-label-s font-bold text-ink">v{ver.versionNo}</span>
                  {ver.uploadedAt && (
                    <span className="type-caption text-ink-3">
                      {new Date(ver.uploadedAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                </div>
                <span className="type-caption text-ink-2">
                  {ver.fileName || 'Document upload'}
                  {isCurrent ? ' · This version' : ''}
                </span>
                {ver.rejectReason && (
                  <span className="type-caption italic text-bad">Reason: {ver.rejectReason}</span>
                )}
              </div>
              <Chip tone={tone}>{label}</Chip>
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <p className="type-caption text-ink-3">
          The customer sees the same list. Approving or rejecting is added to both histories.
        </p>
      </div>
    </div>
  );
};
