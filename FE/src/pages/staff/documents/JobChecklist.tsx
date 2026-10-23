import { type FC, useState } from 'react';
import { App, Empty, Flex, Select, Spin } from 'antd';
import { Button, Callout, Chip, DocumentRow } from '@/components/ui';
import {
  useClearanceJobs,
  useClearanceStatus,
  useGenerateChecklist,
  useJobChecklist,
} from '@/hooks/clearance';
import { type ChecklistItem, ChecklistStatusEnum } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';
import ClearanceSummary from './ClearanceSummary';
import { rowStatus } from './rowStatus';

type Props = {
  jobId: string | null;
  onSelectJob: (jobId: string | null) => void;
  onView: (fileId: string) => void;
  onUpload: (item: ChecklistItem) => void;
};

/** The "Job checklist and gate" tab: pick a job, then its gate, counts and checklist. */
const JobChecklist: FC<Props> = ({ jobId, onSelectJob, onView, onUpload }) => {
  const [jobSearch, setJobSearch] = useState('');
  const { data: jobs = [], isFetching: jobsLoading } = useClearanceJobs(jobSearch);
  const {
    data: checklist = [],
    isLoading: checklistLoading,
    isError: checklistFailed,
  } = useJobChecklist(jobId);
  const { data: status } = useClearanceStatus(jobId);
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
      {/* Job picker: open dossiers, searched on the server by code or club */}
      <div className="rounded-lg border border-line bg-card p-4">
        <Flex align="center" gap={16}>
          <span className="type-label-s shrink-0 text-ink-2">Job</span>
          <Select
            showSearch
            placeholder="Search by job code or club"
            value={jobId || undefined}
            onChange={(value) => onSelectJob(value ?? null)}
            onSearch={setJobSearch}
            loading={jobsLoading}
            className="w-full max-w-md"
            filterOption={false}
            notFoundContent={jobsLoading ? <Spin size="small" /> : 'No open dossier matches'}
            options={[
              ...jobs.map((job) => ({
                value: job.id,
                label: `${job.code}${job.clubName ? ' · ' + job.clubName : ''}`,
              })),
              // A job opened by link (e.g. a departed one) may not be in the open-dossier list; label it by its code.
              ...(jobId && status && !jobs.some((job) => job.id === jobId)
                ? [{ value: jobId, label: status.jobCode }]
                : []),
            ]}
          />
          {jobId && (
            <Button variant="secondary" size="sm" onClick={() => onSelectJob(null)}>
              Clear
            </Button>
          )}
        </Flex>
      </div>

      {!jobId && (
        <div className="rounded-lg border border-line bg-card p-12 text-center">
          <Empty
            description="Choose a job to see its checklist and clearance gate."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      )}

      {jobId && (
        <>
          {status && <ClearanceSummary jobId={jobId} status={status} />}

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
                    status={rowStatus(item)}
                    statusLabel={
                      item.status === ChecklistStatusEnum.REJECTED ? 'Rejected' : undefined
                    }
                    document={
                      <Flex align="center" gap={8}>
                        <span>{item.documentTypeName || item.documentTypeCode}</span>
                        {item.mandatory && <Chip tone="neutral">Mandatory</Chip>}
                        {item.horseName && (
                          <span className="font-display text-ink-3">{item.horseName}</span>
                        )}
                      </Flex>
                    }
                    rule={item.ruleDescription || 'Standard validity validation'}
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
        </>
      )}
    </Flex>
  );
};

export default JobChecklist;
