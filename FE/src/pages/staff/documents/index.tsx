import { useState, type ChangeEvent, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Empty, Input, Modal, Select, Spin, message } from 'antd';
import PageHeader from '@/components/PageHeader';
import {
  Button,
  Callout,
  Chip,
  ClearanceGate,
  DocumentRow,
  Radio,
  StatTile,
  Tabs,
  type DocumentStatus,
} from '@/components/ui';
import { fileApi } from '@/apis/file';
import { apiErrorMessage } from '@/lib/utils';
import {
  useClearanceJobs,
  useClearanceStatus,
  useEvaluateClearanceGate,
  useJobChecklist,
  usePendingReviews,
  useReviewDocument,
  useUploadDocumentVersion,
} from '@/hooks/clearance';
import type { ChecklistItem, DocumentReview, DocumentVersion } from '@/interfaces';

function mapToRowStatus(item: ChecklistItem): DocumentStatus {
  if (item.status === 'CLEARED') return 'cleared';
  if (item.validity === 'RED') return 'red';
  if (item.validity === 'AMBER') return 'amber';
  if (item.status === 'IN_REVIEW') return 'review';
  return 'required';
}

const DocumentsPage: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialJobId = searchParams.get('jobId');

  const [activeTab, setActiveTab] = useState<'pending' | 'checklist'>(
    initialJobId ? 'checklist' : 'pending',
  );
  const [selectedJobId, setSelectedJobId] = useState<string | null>(initialJobId);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [reviewDecision, setReviewDecision] = useState<DocumentReview>('APPROVED');
  const [rejectReason, setRejectReason] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedChecklistItem, setSelectedChecklistItem] = useState<ChecklistItem | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [issuedOn, setIssuedOn] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [issuer, setIssuer] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [messageApi, messageHolder] = message.useMessage();
  const viewFile = (fileId: string) => {
    fileApi.viewFile(fileId).catch((err: unknown) => {
      void messageApi.error(apiErrorMessage(err, 'The file could not be opened.'));
    });
  };

  // Queries (TanStack Query, zero useEffect)
  const [jobSearch, setJobSearch] = useState('');
  const { data: jobs = [], isFetching: jobsLoading } = useClearanceJobs(jobSearch);

  const {
    data: pendingReviews = [],
    isLoading: pendingLoading,
    isError: pendingError,
    refetch: refetchPending,
  } = usePendingReviews();

  const {
    data: checklist = [],
    isLoading: checklistLoading,
    isError: checklistError,
    refetch: refetchChecklist,
  } = useJobChecklist(selectedJobId);

  const { data: statusData, refetch: refetchStatus } = useClearanceStatus(selectedJobId);

  // Mutations
  const reviewMutation = useReviewDocument(selectedJobId);
  const uploadMutation = useUploadDocumentVersion(selectedJobId);
  const evaluateGateMutation = useEvaluateClearanceGate(selectedJobId);

  const handleSelectJob = (jobId: string | null) => {
    setSelectedJobId(jobId);
    if (jobId) {
      setSearchParams({ jobId });
    } else {
      setSearchParams({});
    }
  };

  const openReviewModal = (version: DocumentVersion) => {
    setSelectedVersion(version);
    setReviewDecision('APPROVED');
    setRejectReason('');
    setReviewError(null);
    setReviewModalOpen(true);
  };

  const handleReviewSubmit = async () => {
    if (!selectedVersion) return;
    if (reviewDecision === 'REJECTED' && !rejectReason.trim()) {
      setReviewError(
        'Add the reason the customer will read before rejecting this document (BR-F2-07).',
      );
      return;
    }
    setReviewError(null);
    try {
      await reviewMutation.mutateAsync({
        versionId: selectedVersion.id,
        data: {
          review: reviewDecision,
          rejectReason: reviewDecision === 'REJECTED' ? rejectReason.trim() : undefined,
        },
      });
      setReviewModalOpen(false);
      setSelectedVersion(null);
    } catch (err: unknown) {
      setReviewError(apiErrorMessage(err, 'The review decision could not be saved.'));
    }
  };

  const openUploadModal = (item: ChecklistItem) => {
    setSelectedChecklistItem(item);
    setUploadFile(null);
    setIssuedOn('');
    setValidUntil('');
    setIssuer('');
    setUploadError(null);
    setUploadModalOpen(true);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedChecklistItem) return;
    if (!uploadFile) {
      setUploadError('Choose the document file to upload.');
      return;
    }
    if (!issuedOn.trim() || !validUntil.trim()) {
      setUploadError('Enter the issue date and the valid-until date printed on the document.');
      return;
    }
    setUploadError(null);
    setUploadingFile(true);
    try {
      // 1. Upload file via authenticated POST /api/v1/files (PR #79)
      const stored = await fileApi.upload(uploadFile);

      // 2. Attach fileId to document version and evaluate validity
      await uploadMutation.mutateAsync({
        checklistItemId: selectedChecklistItem.id,
        data: {
          fileId: stored.id,
          issuedOn: issuedOn.trim(),
          validUntil: validUntil.trim(),
          issuer: issuer.trim() || undefined,
        },
      });
      setUploadModalOpen(false);
      setSelectedChecklistItem(null);
    } catch (err: unknown) {
      setUploadError(apiErrorMessage(err, 'The document could not be uploaded.'));
    } finally {
      setUploadingFile(false);
    }
  };

  const handleEvaluateGate = async () => {
    if (!selectedJobId) return;
    try {
      await evaluateGateMutation.mutateAsync(selectedJobId);
    } catch {
      // error handled by mutation state
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {messageHolder}
      <PageHeader
        title="Documents"
        summary="Documents waiting for your check, and each job's checklist against its clearance gate."
        right={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void refetchPending();
                if (selectedJobId) {
                  void refetchChecklist();
                  void refetchStatus();
                }
              }}
            >
              Refresh
            </Button>
          </div>
        }
      />

      <Tabs
        label="Documents views"
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'pending', label: 'Waiting for review', count: pendingReviews.length },
          { key: 'checklist', label: 'Job checklist and gate' },
        ]}
      />

      {/* Tab 1: Pending Reviews */}
      {activeTab === 'pending' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="type-h3 text-ink">Review inbox</h2>
              <p className="type-body-s text-ink-3">
                Only the transport specialist reviews documents. A document checked as RED can't be
                approved.
              </p>
            </div>
            <span className="type-caption text-ink-3">
              {pendingReviews.length} {pendingReviews.length === 1 ? 'document' : 'documents'}{' '}
              pending review
            </span>
          </div>

          {pendingLoading && (
            <div className="flex justify-center p-12">
              <Spin size="large" />
            </div>
          )}

          {pendingError && (
            <Callout tone="bad" title="The review inbox could not be loaded">
              Refresh the page. If it keeps failing, sign in again.
            </Callout>
          )}

          {!pendingLoading && !pendingError && pendingReviews.length === 0 && (
            <div className="rounded-lg border border-line bg-card p-12 text-center">
              <Empty
                description="Nothing is waiting for your review."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          )}

          {!pendingLoading && pendingReviews.length > 0 && (
            <div className="rounded-lg border border-line bg-card overflow-hidden divide-y divide-line">
              {pendingReviews.map((v) => (
                <div key={v.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="type-label-m text-ink">{v.fileName}</span>
                      <Chip tone="info">v{v.versionNo}</Chip>
                      <Chip tone="warn">Waiting for review</Chip>
                    </div>
                    <div className="type-body-s text-ink-3 flex items-center gap-3">
                      {v.uploadedByName && <span>Uploaded by: {v.uploadedByName}</span>}
                      {v.validUntil && <span>Valid until: {v.validUntil}</span>}
                      {v.issuer && <span>Issuer: {v.issuer}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="secondary" size="sm" onClick={() => viewFile(v.fileId)}>
                      View file
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => openReviewModal(v)}>
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Job Clearance Checklist & Gate */}
      {activeTab === 'checklist' && (
        <div className="flex flex-col gap-6">
          {/* Job picker: open dossiers, searched on the server by code or club */}
          <div className="flex items-center gap-4 p-4 rounded-lg border border-line bg-card">
            <span className="type-label-s text-ink-2 shrink-0">Job</span>
            <Select
              showSearch
              placeholder="Search by job code or club"
              value={selectedJobId || undefined}
              onChange={(val) => handleSelectJob(val ?? null)}
              onSearch={setJobSearch}
              loading={jobsLoading}
              className="w-full max-w-md"
              filterOption={false}
              notFoundContent={jobsLoading ? <Spin size="small" /> : 'No open dossier matches'}
              options={[
                ...jobs.map((j) => ({
                  value: j.id,
                  label: `${j.code}${j.clubName ? ' · ' + j.clubName : ''}`,
                })),
                // A job opened by link (e.g. a departed one) may not be in the open-dossier list; label it by its code.
                ...(selectedJobId && statusData && !jobs.some((j) => j.id === selectedJobId)
                  ? [{ value: selectedJobId, label: statusData.jobCode }]
                  : []),
              ]}
            />
            {selectedJobId && (
              <Button variant="secondary" size="sm" onClick={() => handleSelectJob(null)}>
                Clear
              </Button>
            )}
          </div>

          {!selectedJobId && (
            <div className="rounded-lg border border-line bg-card p-12 text-center">
              <Empty
                description="Choose a job to see its checklist and clearance gate."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          )}

          {selectedJobId && (
            <>
              {/* Clearance Gate Component */}
              {statusData && (
                <ClearanceGate
                  state={statusData.clearanceReady ? 'clear' : 'locked'}
                  title={statusData.clearanceReady ? 'Clear to depart' : 'Departure locked'}
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={evaluateGateMutation.isPending}
                      onClick={handleEvaluateGate}
                    >
                      {evaluateGateMutation.isPending ? 'Evaluating...' : 'Re-evaluate gate'}
                    </Button>
                  }
                >
                  {statusData.clearanceReady
                    ? 'Every mandatory document is approved and GREEN, quarantines are complete and every permit is issued.'
                    : `${statusData.clearedMandatoryItems} of ${statusData.mandatoryItems} mandatory documents cleared · ${statusData.outstandingIssues.length} outstanding.`}
                </ClearanceGate>
              )}

              {/* Stat Tiles */}
              {statusData && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatTile
                    tone="neutral"
                    label="Checklist items"
                    value={statusData.totalChecklistItems}
                  />
                  <StatTile
                    tone="ok"
                    label="Mandatory cleared"
                    value={statusData.clearedMandatoryItems}
                  />
                  <StatTile
                    tone="warn"
                    label="Mandatory remaining"
                    value={Math.max(
                      0,
                      statusData.mandatoryItems - statusData.clearedMandatoryItems,
                    )}
                  />
                  <StatTile
                    tone={statusData.outstandingIssues.length > 0 ? 'bad' : 'ok'}
                    label="Outstanding"
                    value={statusData.outstandingIssues.length}
                  />
                </div>
              )}

              {/* Outstanding issues callout */}
              {statusData && statusData.outstandingIssues.length > 0 && (
                <Callout tone="bad" title="What holds departure">
                  <ul className="list-disc list-inside space-y-1 mt-1 text-ink-2">
                    {statusData.outstandingIssues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </Callout>
              )}

              {/* Checklist table */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="type-h3 text-ink">Checklist</h3>
                  <span className="type-caption text-ink-3">
                    {checklist.length} items configured
                  </span>
                </div>

                {checklistLoading && (
                  <div className="flex justify-center p-12">
                    <Spin size="large" />
                  </div>
                )}

                {checklistError && (
                  <Callout tone="bad" title="The checklist could not be loaded">
                    Refresh the page. If it keeps failing, sign in again.
                  </Callout>
                )}

                {!checklistLoading && !checklistError && checklist.length === 0 && (
                  <div className="rounded-lg border border-line bg-card p-12 text-center">
                    <Empty description="No checklist items found for this job." />
                  </div>
                )}

                {!checklistLoading && checklist.length > 0 && (
                  <div className="rounded-lg border border-line bg-card overflow-hidden">
                    {checklist.map((item) => (
                      <DocumentRow
                        key={item.id}
                        status={mapToRowStatus(item)}
                        statusLabel={item.status === 'REJECTED' ? 'Rejected' : undefined}
                        document={
                          <div className="flex items-center gap-2">
                            <span>{item.documentTypeName || item.documentTypeCode}</span>
                            {item.mandatory && <Chip tone="neutral">Mandatory</Chip>}
                            {item.horseName && (
                              <span className="font-display text-ink-3">{item.horseName}</span>
                            )}
                          </div>
                        }
                        rule={item.ruleDescription || 'Standard validity validation'}
                        result={
                          item.validityNote ||
                          (item.status === 'AWAITING_UPLOAD' ? 'Not uploaded yet' : undefined)
                        }
                        holder={item.holder ? `With ${item.holder.toLowerCase()}` : undefined}
                        version={
                          item.currentVersion
                            ? `v${item.currentVersion.versionNo} · ${item.currentVersion.fileName}`
                            : 'No version'
                        }
                        actions={
                          <div className="flex items-center gap-2">
                            {item.currentVersion && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => viewFile(item.currentVersion!.fileId)}
                              >
                                View
                              </Button>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openUploadModal(item)}
                            >
                              Upload
                            </Button>
                          </div>
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Review Modal */}
      <Modal
        open={reviewModalOpen}
        title={`Review ${selectedVersion?.fileName ?? 'document'}`}
        onCancel={() => setReviewModalOpen(false)}
        footer={[
          <Button
            key="cancel"
            variant="secondary"
            size="sm"
            onClick={() => setReviewModalOpen(false)}
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            variant="primary"
            size="sm"
            disabled={reviewMutation.isPending}
            onClick={handleReviewSubmit}
          >
            {reviewMutation.isPending
              ? 'Saving…'
              : reviewDecision === 'REJECTED'
                ? 'Reject document'
                : 'Approve document'}
          </Button>,
        ]}
      >
        <div className="flex flex-col gap-4 py-3">
          {reviewError && <Callout tone="bad" title={reviewError} />}

          <div className="type-body-s text-ink-2">
            A document checked as RED can't be approved. A rejection sends the item back to the
            customer with your reason.
          </div>

          <div className="flex gap-4">
            <Radio
              name="decision"
              label="Approve"
              checked={reviewDecision === 'APPROVED'}
              onChange={() => setReviewDecision('APPROVED')}
            />
            <Radio
              name="decision"
              label="Reject"
              checked={reviewDecision === 'REJECTED'}
              onChange={() => setReviewDecision('REJECTED')}
            />
          </div>

          {reviewDecision === 'REJECTED' && (
            <div className="flex flex-col gap-1.5">
              <label className="type-label-s text-ink">
                Reason the customer will read <span className="text-bad">*</span>
              </label>
              <Input.TextArea
                rows={3}
                placeholder="What is wrong with this document and what to send instead"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Upload Modal */}
      <Modal
        open={uploadModalOpen}
        title={`Upload a new version · ${selectedChecklistItem?.documentTypeName ?? ''}`}
        onCancel={() => setUploadModalOpen(false)}
        footer={[
          <Button
            key="cancel"
            variant="secondary"
            size="sm"
            onClick={() => setUploadModalOpen(false)}
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            variant="primary"
            size="sm"
            disabled={uploadingFile || uploadMutation.isPending}
            onClick={handleUploadSubmit}
          >
            {uploadingFile || uploadMutation.isPending ? 'Uploading…' : 'Upload and check'}
          </Button>,
        ]}
      >
        <div className="flex flex-col gap-4 py-3">
          {uploadError && <Callout tone="bad" title={uploadError} />}

          <div className="flex flex-col gap-1.5">
            <label className="type-label-s text-ink">
              File (PDF, JPEG, PNG or HEIC, up to 25 MB) <span className="text-bad">*</span>
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg,.heic,.heif"
              className="type-body-s rounded border border-line p-2"
            />
            {uploadFile && (
              <span className="type-caption text-ink-3">
                Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="type-label-s text-ink">
                Issued on <span className="text-bad">*</span>
              </label>
              <Input
                type="date"
                required
                value={issuedOn}
                onChange={(e) => setIssuedOn(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="type-label-s text-ink">
                Valid until <span className="text-bad">*</span>
              </label>
              <Input
                type="date"
                required
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="type-label-s text-ink">Issuer (authority or laboratory)</label>
            <Input
              placeholder="e.g. DAH Vietnam, USDA APHIS"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DocumentsPage;
