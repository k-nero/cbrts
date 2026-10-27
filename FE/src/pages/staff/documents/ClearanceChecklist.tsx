import { type FC, useState } from 'react';
import { App, Empty, Flex, Spin } from 'antd';
import { Button, Callout, Chip, DocumentRow } from '@/components/ui';
import {
  useCatalogUpdates,
  useClearanceStatus,
  useGenerateChecklist,
  useJobChecklist,
} from '@/hooks/clearance';
import { type CatalogUpdate, type ChecklistItem, ChecklistStatusEnum } from '@/interfaces';
import { apiErrorMessage, rowStatus } from '@/lib/utils';
import { CatalogMoveModal } from './CatalogMoveModal';
import { CatalogUpdateCallout } from './CatalogUpdateCallout';
import ClearanceSummary from './ClearanceSummary';

type Props = {
  jobId: string;
  onView: (fileId: string) => void;
  onUpload: (item: ChecklistItem) => void;
  /** The gate above the counts. The job page has the gate in its header. */
  withGate?: boolean;
};

/** One job's clearance gate, counts and checklist: the Documents page's job view and the job page's Clearance tab. */
const ClearanceChecklist: FC<Props> = ({ jobId, onView, onUpload, withGate = true }) => {
  const {
    data: checklist = [],
    isLoading: checklistLoading,
    isError: checklistFailed,
  } = useJobChecklist(jobId);
  const { data: status } = useClearanceStatus(jobId);
  const { data: updates = [] } = useCatalogUpdates(jobId);
  const [moving, setMoving] = useState<CatalogUpdate | null>(null);
  const generate = useGenerateChecklist();
  const { message } = App.useApp();

  // BR-F2-01: items from the pinned catalogs. A re-run only adds what is missing (a horse added later).
  const onGenerate = async (id: string) => {
    try {
      const items = await generate.mutateAsync(id);
      const added = items.length - checklist.length;
      message.success(
        added > 0
          ? `${added} ${added === 1 ? 'item' : 'items'} added from the regulation catalog`
          : 'The checklist already has every item the catalog requires',
      );
    } catch (error) {
      message.error(apiErrorMessage(error, "The checklist wasn't generated. Try again."));
    }
  };

  return (
    <Flex vertical gap={24}>
      {status && <ClearanceSummary jobId={jobId} status={status} withGate={withGate} />}

      {updates.map((u) => (
        <CatalogUpdateCallout key={u.versionId} update={u} onMove={setMoving} />
      ))}

      <Flex vertical gap={8}>
        <Flex align="center" justify="space-between">
          <h3 className="type-h3 text-ink">Checklist</h3>
          <Flex component="span" align="center" gap={12}>
            <span className="type-caption text-ink-3">{checklist.length} items configured</span>
            <Button
              variant="secondary"
              size="sm"
              disabled={generate.isPending || checklistLoading}
              onClick={() => void onGenerate(jobId)}
            >
              {checklist.length === 0 ? 'Generate checklist' : 'Add missing items'}
            </Button>
          </Flex>
        </Flex>

        {checklistLoading && (
          <div className="p-12">
            <Flex justify="center">
              <Spin size="large" />
            </Flex>
          </div>
        )}

        {checklistFailed && (
          <Callout tone="bad" title="The checklist could not be loaded">
            Refresh the page. If it keeps failing, sign in again.
          </Callout>
        )}

        {!checklistLoading && !checklistFailed && checklist.length === 0 && (
          <div className="rounded-lg border border-line bg-card p-12 text-center">
            <Empty description="No checklist yet. Generate it from the regulation catalogs of the countries on this route." />
          </div>
        )}

        {!checklistLoading && checklist.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-line bg-card">
            {checklist.map((item) => (
              <DocumentRow
                key={item.id}
                status={item.droppedAt ? 'required' : rowStatus(item)}
                statusLabel={
                  item.droppedAt
                    ? 'No longer required'
                    : item.status === ChecklistStatusEnum.REJECTED
                      ? 'Rejected'
                      : undefined
                }
                className={item.droppedAt ? 'opacity-60' : undefined}
                document={
                  <Flex align="center" gap={8}>
                    <span>{item.documentTypeName || item.documentTypeCode}</span>
                    {item.mandatory && <Chip tone="neutral">Mandatory</Chip>}
                    {item.addedByUpdate && <Chip tone="info">Added by catalog update</Chip>}
                    {item.horseName && (
                      <span className="font-display text-ink-3">{item.horseName}</span>
                    )}
                  </Flex>
                }
                rule={
                  item.droppedAt
                    ? `Dropped from the catalog when the job moved off ${item.ruleCatalog ?? 'its version'}`
                    : [item.ruleDescription || 'Standard validity validation', item.ruleCatalog]
                        .filter(Boolean)
                        .join(' · ')
                }
                result={
                  item.validityNote ||
                  (item.status === ChecklistStatusEnum.AWAITING_UPLOAD
                    ? 'Not uploaded yet'
                    : undefined)
                }
                holder={item.holder ? `With ${item.holder.toLowerCase()}` : undefined}
                version={
                  item.currentVersion
                    ? `v${item.currentVersion.versionNo} · ${item.currentVersion.fileName}`
                    : 'No version'
                }
                actions={
                  <Flex align="center" gap={8}>
                    {item.currentVersion && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onView(item.currentVersion!.fileId)}
                      >
                        View
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => onUpload(item)}>
                      Upload
                    </Button>
                  </Flex>
                }
              />
            ))}
          </div>
        )}
      </Flex>

      <CatalogMoveModal jobId={jobId} update={moving} onClose={() => setMoving(null)} />
    </Flex>
  );
};

export default ClearanceChecklist;
