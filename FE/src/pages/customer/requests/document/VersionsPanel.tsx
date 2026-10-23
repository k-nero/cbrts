import type { FC } from 'react';
import { App, Spin } from 'antd';

import { fileApi } from '@/apis/file';
import { Button, Chip, cx, Panel, type Tone } from '@/components/ui';
import { useDocumentVersions } from '@/hooks/clearance';
import { type DocumentVersion, DocumentReviewEnum } from '@/interfaces';
import { formatDate } from '@/lib/utils';

/** The review's word, or "Replaced" once a newer version is on file and this one was never decided. */
function versionChip(v: DocumentVersion, current: boolean): { tone: Tone; word: string } {
  if (v.review === DocumentReviewEnum.APPROVED) return { tone: 'ok', word: 'Approved' };
  if (v.review === DocumentReviewEnum.REJECTED) return { tone: 'bad', word: 'Rejected' };
  return current ? { tone: 'info', word: 'In review' } : { tone: 'neutral', word: 'Replaced' };
}

function versionDetail(v: DocumentVersion): string {
  const parts = [
    v.sampledOn && `Sampled ${formatDate(v.sampledOn)}`,
    v.issuedOn && `Issued ${formatDate(v.issuedOn)}`,
    v.validUntil && `valid until ${formatDate(v.validUntil)}`,
    v.issuer,
  ].filter(Boolean);
  return [parts.join(' · '), v.rejectReason && `Rejected: ${v.rejectReason}`]
    .filter(Boolean)
    .join('. ');
}

/** Every version of the document, newest first (BR-F2-05): an upload never overwrites an earlier one. */
export const VersionsPanel: FC<{ checklistItemId: string; currentId?: string }> = ({
  checklistItemId,
  currentId,
}) => {
  const { message } = App.useApp();
  const versions = useDocumentVersions(checklistItemId);
  const rows = versions.data ?? [];
  return (
    <Panel title="Versions">
      {versions.isPending ? (
        <Spin />
      ) : rows.length === 0 ? (
        <p className="type-body-s m-0 text-ink-3">Nothing uploaded yet.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {rows.map((v) => {
            const current = v.id === currentId;
            const chip = versionChip(v, current);
            return (
              <li
                key={v.id}
                className="flex items-start gap-3 border-t border-line py-3 first:border-t-0 first:pt-0"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <span className={cx('type-data', current ? 'text-ink' : 'text-ink-3')}>
                      {`v${v.versionNo}`}
                    </span>
                    <span className="type-caption text-ink-3">{formatDate(v.uploadedAt)}</span>
                  </span>
                  <span className={cx('type-body-s', current ? 'text-ink-2' : 'text-ink-3')}>
                    {versionDetail(v)}
                  </span>
                  <span>
                    <Button
                      variant="ghost"
                      size="sm"
                      leadingIcon="eye"
                      aria-label={`View ${v.fileName}`}
                      onClick={() =>
                        fileApi
                          .viewFile(v.fileId)
                          .catch(() => message.error('The file could not be opened.'))
                      }
                    >
                      {v.fileName}
                    </Button>
                  </span>
                </span>
                <Chip tone={chip.tone} dot={chip.tone !== 'neutral'}>
                  {chip.word}
                </Chip>
              </li>
            );
          })}
        </ul>
      )}
      <p className="type-body-s m-0 mt-3 text-ink-3">
        Every version is kept, and your transport specialist sees the same list. A refused file is
        never stored.
      </p>
    </Panel>
  );
};
