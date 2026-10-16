import { useState, type ChangeEvent, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Empty, Input, Modal, Select, Spin } from 'antd';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { Chip } from '@/components/ui/Chip';
import { ClearanceGate } from '@/components/ui/ClearanceGate';
import { DocumentRow, type DocumentStatus } from '@/components/ui/DocumentRow';
import { StatTile } from '@/components/ui/StatTile';
import { fileApi } from '@/apis/file';
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

  const [activeTab, setActiveTab] = useState<'pending' | 'checklist'>(initialJobId ? 'checklist' : 'pending');
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

  // Queries (TanStack Query, zero useEffect)
  const { data: jobs = [], isLoading: jobsLoading } = useClearanceJobs();

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

  const {
    data: statusData,
    refetch: refetchStatus,
  } = useClearanceStatus(selectedJobId);

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
      setReviewError('A reason is strictly required when rejecting a document (BR-F2-07).');
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
      const msg = err instanceof Error ? err.message : 'Failed to submit review decision.';
      setReviewError(msg);
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
      setUploadError('Please choose a file to upload.');
      return;
    }
    if (!issuedOn.trim() || !validUntil.trim()) {
      setUploadError('Issue date and expiry date are strictly required (US-F2-03, US-F2-09).');
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
      const msg = err instanceof Error ? err.message : 'Failed to upload document version.';
      setUploadError(msg);
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
      <PageHeader
        title="Clearance & Document Management"
        summary="Transport Specialist dossier review, document validity verification, and clearance gate evaluation."
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

      {/* Navigation tabs */}
      <div className="flex border-b border-line gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`pb-3 type-label-m flex items-center gap-2 border-b-2 font-medium transition-colors ${
            activeTab === 'pending'
              ? 'border-ink text-ink font-semibold'
              : 'border-transparent text-ink-3 hover:text-ink-2'
          }`}
        >
          <span>Pending Reviews</span>
          {pendingReviews.length > 0 && (
            <Chip tone="warn">
              {pendingReviews.length}
            </Chip>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('checklist')}
          className={`pb-3 type-label-m flex items-center gap-2 border-b-2 font-medium transition-colors ${
            activeTab === 'checklist'
              ? 'border-ink text-ink font-semibold'
              : 'border-transparent text-ink-3 hover:text-ink-2'
          }`}
        >
          <span>Job Dossier & Clearance Gate</span>
        </button>
      </div>

      {/* Tab 1: Pending Reviews */}
      {activeTab === 'pending' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="type-h3 text-ink">Review Inbox</h2>
              <p className="type-body-s text-ink-3">
                Exclusively reviewed by Transport Specialist. Approvals are blocked if document validity is RED.
              </p>
            </div>
            <span className="type-caption text-ink-3">
              {pendingReviews.length} {pendingReviews.length === 1 ? 'document' : 'documents'} pending review
            </span>
          </div>

          {pendingLoading && (
            <div className="flex justify-center p-12">
              <Spin size="large" />
            </div>
          )}

          {pendingError && (
            <Alert
              type="error"
              message="Failed to load pending reviews"
              description="Please ensure you have Transport Specialist role and a valid session."
              showIcon
            />
          )}

          {!pendingLoading && !pendingError && pendingReviews.length === 0 && (
            <div className="rounded-lg border border-line bg-card p-12 text-center">
              <Empty
                description="No pending reviews at this time. All documents are up to date."
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
                      <span className="type-label-m text-ink font-medium">{v.fileName}</span>
                      <Chip tone="info">v{v.versionNo}</Chip>
                      <Chip tone="warn">PENDING REVIEW</Chip>
                    </div>
                    <div className="type-body-s text-ink-3 flex items-center gap-3">
                      {v.uploadedByName && <span>Uploaded by: {v.uploadedByName}</span>}
                      {v.validUntil && <span>Valid until: {v.validUntil}</span>}
                      {v.issuer && <span>Issuer: {v.issuer}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void fileApi.viewFile(v.fileId)}
                    >
                      View File
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openReviewModal(v)}
                    >
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
          {/* Job Selection Dropdown (Finding 10: No hardcoded IDs) */}
          <div className="flex items-center gap-4 p-4 rounded-lg border border-line bg-card">
            <span className="type-label-s text-ink-2 shrink-0 font-medium">Select Transport Job:</span>
            <Select
              showSearch
              placeholder="Choose a job from the active shipments..."
              value={selectedJobId || undefined}
              onChange={(val) => handleSelectJob(val ?? null)}
              loading={jobsLoading}
              className="min-w-[320px] max-w-md"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={jobs.map((j) => ({
                value: j.id,
                label: `${j.code} ${j.clubName ? '· ' + j.clubName : ''} (${j.dossierStatus})`,
              }))}
            />
            {selectedJobId && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSelectJob(null)}
              >
                Clear
              </Button>
            )}
          </div>

          {!selectedJobId && (
            <div className="rounded-lg border border-line bg-card p-12 text-center">
              <Empty
                description="Please select a transport job from the dropdown above to view its checklist and clearance gate."
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
                    ? 'All mandatory documents are GREEN, approved, and quarantines/permits are fulfilled.'
                    : `${statusData.clearedMandatoryItems}/${statusData.mandatoryItems} mandatory documents cleared. ${statusData.outstandingIssues.length} outstanding issues.`}
                </ClearanceGate>
              )}

              {/* Stat Tiles */}
              {statusData && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatTile
                    tone="neutral"
                    label="Total Items"
                    value={statusData.totalChecklistItems}
                  />
                  <StatTile
                    tone="ok"
                    label="Cleared Items"
                    value={statusData.clearedMandatoryItems}
                  />
                  <StatTile
                    tone="warn"
                    label="Mandatory Remaining"
                    value={Math.max(0, statusData.mandatoryItems - statusData.clearedMandatoryItems)}
                  />
                  <StatTile
                    tone={statusData.outstandingIssues.length > 0 ? 'bad' : 'ok'}
                    label="Outstanding Issues"
                    value={statusData.outstandingIssues.length}
                  />
                </div>
              )}

              {/* Outstanding issues callout */}
              {statusData && statusData.outstandingIssues.length > 0 && (
                <Callout
                  tone="bad"
                  title="Outstanding Clearance Blockers"
                >
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
                  <h3 className="type-h3 text-ink">Job Document Checklist</h3>
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
                  <Alert
                    type="error"
                    message="Failed to load job checklist"
                    description="Please verify your session and permissions."
                    showIcon
                  />
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
                            {item.horseName && <span className="text-xs text-ink-3">({item.horseName})</span>}
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
                                onClick={() => void fileApi.viewFile(item.currentVersion!.fileId)}
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
        title={`Review Document: ${selectedVersion?.fileName ?? ''}`}
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
            {reviewMutation.isPending ? 'Submitting...' : 'Confirm Decision'}
          </Button>,
        ]}
      >
        <div className="flex flex-col gap-4 py-3">
          {reviewError && (
            <Alert type="error" message={reviewError} showIcon />
          )}

          <div className="type-body-s text-ink-2">
            Please select your review decision. Note that documents with RED validity cannot be approved.
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="decision"
                checked={reviewDecision === 'APPROVED'}
                onChange={() => setReviewDecision('APPROVED')}
              />
              <span className="type-label-m text-ink">Approve Document</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="decision"
                checked={reviewDecision === 'REJECTED'}
                onChange={() => setReviewDecision('REJECTED')}
              />
              <span className="type-label-m text-ink">Reject Document</span>
            </label>
          </div>

          {reviewDecision === 'REJECTED' && (
            <div className="flex flex-col gap-1.5">
              <label className="type-label-s text-ink">
                Rejection Reason <span className="text-bad">*</span>
              </label>
              <Input.TextArea
                rows={3}
                placeholder="Provide explicit reason why this document version was rejected..."
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
        title={`Upload New Version: ${selectedChecklistItem?.documentTypeName ?? ''}`}
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
            {uploadingFile || uploadMutation.isPending ? 'Uploading...' : 'Upload & Evaluate'}
          </Button>,
        ]}
      >
        <div className="flex flex-col gap-4 py-3">
          {uploadError && (
            <Alert type="error" message={uploadError} showIcon />
          )}

          <div className="flex flex-col gap-1.5">
            <label className="type-label-s text-ink">
              Choose File (PDF, PNG, JPG) <span className="text-bad">*</span>
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg"
              className="border border-line rounded p-2 text-sm"
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
                Issued Date <span className="text-bad">*</span>
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
                Valid Until <span className="text-bad">*</span>
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
            <label className="type-label-s text-ink">Issuing Authority / Laboratory</label>
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
