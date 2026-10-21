import { FC, useState, useMemo, useEffect } from 'react';
import {
  Flex,
  Select,
  Modal,
  Form,
  Input,
  DatePicker,
  Popconfirm,
  Tag,
  Spin,
  Alert,
  message,
} from 'antd';
import { BankOutlined, ExperimentOutlined, ReloadOutlined, SendOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';

import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Chip } from '@/components/ui/Chip';
import { Callout } from '@/components/ui/Callout';
import { StatTile } from '@/components/ui/StatTile';
import { ClearanceGate } from '@/components/ui/ClearanceGate';
import {
  useAuthorities,
  useClearanceJobs,
  useQuarantineFacilities,
  useJobSubmissions,
  useCreateSubmission,
  useUpdateSubmission,
  useJobQuarantines,
  useCreateQuarantine,
  useCompleteQuarantine,
  useClearanceStatus,
  useEvaluateClearanceGate,
  useCheckLateSubmissions,
} from '@/hooks/clearance';
import type {
  JobSummary,
  AuthoritySubmission,
  SubmissionKind,
  SubmissionStatus,
  CreateAuthoritySubmissionRequest,
  UpdateAuthoritySubmissionRequest,
  CreateQuarantinePeriodRequest,
} from '@/interfaces';

const SUBMISSION_KIND_LABELS: Record<SubmissionKind, string> = {
  EXPORT_HEALTH_CERTS: 'Export Health Certificates (DAH / RAHO)',
  CUSTOMS_DOSSIER: 'Border Customs Export/Import Dossier',
  IMPORT_PERMIT: 'Live Equine Import Permit (GDAHP)',
};

const STATUS_CHIP_CONFIG: Record<
  SubmissionStatus,
  { tone: 'ok' | 'info' | 'warn' | 'bad' | 'neutral'; label: string }
> = {
  READY_TO_FILE: { tone: 'warn', label: 'Ready to file' },
  FILED: { tone: 'info', label: 'With the authority' },
  ADDITIONAL_INFO: { tone: 'warn', label: 'Action required' },
  ISSUED: { tone: 'ok', label: 'Approved' },
  REFUSED: { tone: 'bad', label: 'Refused' },
};

const AuthoritiesPage: FC = () => {
  const [jobSearch, setJobSearch] = useState('');
  const { data: clearanceJobs = [], isLoading: loadingJobs } = useClearanceJobs(jobSearch);
  const { data: quarantineStations = [], isLoading: loadingStations } = useQuarantineFacilities();
  const [jobId, setJobId] = useState<string | null>(null);

  // Auto-select first job if not yet selected
  useEffect(() => {
    if (!jobId && clearanceJobs.length > 0) {
      setJobId(clearanceJobs[0].id);
    }
  }, [jobId, clearanceJobs]);

  const selectedJob = clearanceJobs.find((j: JobSummary) => j.id === jobId);

  // Queries
  const { data: authorities = [], isLoading: loadingAuthorities } = useAuthorities();
  const {
    data: submissions = [],
    isLoading: loadingSubmissions,
    refetch: refetchSubmissions,
  } = useJobSubmissions(jobId);
  const {
    data: quarantines = [],
    isLoading: loadingQuarantines,
    refetch: refetchQuarantines,
  } = useJobQuarantines(jobId);
  const {
    data: clearanceStatus,
    isLoading: loadingStatus,
    refetch: refetchStatus,
  } = useClearanceStatus(jobId);

  // Mutations
  const createSubmissionMutation = useCreateSubmission(jobId);
  const updateSubmissionMutation = useUpdateSubmission(jobId);
  const createQuarantineMutation = useCreateQuarantine(jobId);
  const completeQuarantineMutation = useCompleteQuarantine(jobId);
  const evaluateGateMutation = useEvaluateClearanceGate(jobId);
  const checkLateMutation = useCheckLateSubmissions();

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [updateModalOpen, setUpdateModalOpen] = useState<boolean>(false);
  const [quarantineModalOpen, setQuarantineModalOpen] = useState<boolean>(false);
  const [selectedSubmission, setSelectedSubmission] = useState<AuthoritySubmission | null>(null);

  // Forms
  const [createForm] = Form.useForm<{
    authorityId: string;
    kind: SubmissionKind;
    referenceNo?: string;
    expectedBy?: Dayjs;
  }>();

  const [updateForm] = Form.useForm<{
    status: SubmissionStatus;
    referenceNo?: string;
    expectedBy?: Dayjs;
  }>();

  const [quarantineForm] = Form.useForm<{
    placeId: string;
    dates: [Dayjs, Dayjs];
  }>();

  // Metrics
  const stats = useMemo(() => {
    const total = submissions.length;
    const approved = submissions.filter((s) => s.status === 'ISSUED').length;
    const overdueCount = submissions.filter((s) => s.isOverdue || s.status === 'REFUSED').length;
    const withAuthorities = submissions.filter(
      (s) => s.status === 'FILED' || s.status === 'READY_TO_FILE' || s.status === 'ADDITIONAL_INFO',
    ).length;
    const completedQuarantines = quarantines.filter((q) => q.isCompleted).length;
    return { total, approved, overdueCount, withAuthorities, completedQuarantines };
  }, [submissions, quarantines]);

  // Handlers
  const handleRefresh = () => {
    void refetchSubmissions();
    void refetchQuarantines();
    void refetchStatus();
    message.success('Latest data refreshed.');
  };

  const handleOpenCreateModal = () => {
    createForm.resetFields();
    createForm.setFieldsValue({
      kind: 'EXPORT_HEALTH_CERTS',
      expectedBy: dayjs().add(4, 'day'),
    });
    setCreateModalOpen(true);
  };

  const handleCreateSubmission = async () => {
    try {
      const values = await createForm.validateFields();
      const payload: CreateAuthoritySubmissionRequest = {
        authorityId: values.authorityId,
        kind: values.kind,
        referenceNo: values.referenceNo?.trim() || undefined,
        expectedBy: values.expectedBy ? values.expectedBy.format('YYYY-MM-DD') : undefined,
      };
      await createSubmissionMutation.mutateAsync(payload);
      message.success('Authority submission recorded successfully.');
      setCreateModalOpen(false);
    } catch {
      // Form validation error or API failure handled
    }
  };

  const handleOpenUpdateModal = (submission: AuthoritySubmission) => {
    setSelectedSubmission(submission);
    updateForm.resetFields();
    updateForm.setFieldsValue({
      status: submission.status,
      referenceNo: submission.referenceNo,
      expectedBy: submission.expectedBy ? dayjs(submission.expectedBy) : undefined,
    });
    setUpdateModalOpen(true);
  };

  const handleUpdateSubmission = async () => {
    if (!selectedSubmission) return;
    try {
      const values = await updateForm.validateFields();
      const payload: UpdateAuthoritySubmissionRequest = {
        status: values.status,
        referenceNo: values.referenceNo?.trim() || undefined,
        expectedBy: values.expectedBy ? values.expectedBy.format('YYYY-MM-DD') : undefined,
      };
      await updateSubmissionMutation.mutateAsync({
        submissionId: selectedSubmission.id,
        data: payload,
      });
      message.success('Submission status updated successfully.');
      setUpdateModalOpen(false);
    } catch {
      // Form validation error
    }
  };

  const handleOpenQuarantineModal = () => {
    quarantineForm.resetFields();
    quarantineForm.setFieldsValue({
      placeId: quarantineStations[0]?.id,
      dates: [dayjs(), dayjs().add(7, 'day')],
    });
    setQuarantineModalOpen(true);
  };

  const handleCreateQuarantine = async () => {
    try {
      const values = await quarantineForm.validateFields();
      const [start, end] = values.dates;
      if (end.diff(start, 'day') < 7) {
        message.error(
          'Quarantine period must be at least 7 days according to veterinary regulations.',
        );
        return;
      }
      const payload: CreateQuarantinePeriodRequest = {
        placeId: values.placeId,
        startsOn: start.format('YYYY-MM-DD'),
        endsOn: end.format('YYYY-MM-DD'),
      };
      await createQuarantineMutation.mutateAsync(payload);
      message.success('Quarantine period scheduled successfully.');
      setQuarantineModalOpen(false);
    } catch {
      // Validation error
    }
  };

  const handleCompleteQuarantine = async (quarantineId: string) => {
    try {
      await completeQuarantineMutation.mutateAsync(quarantineId);
      message.success('Quarantine inspection confirmed. Clearance gate re-evaluated.');
    } catch {
      message.error('Failed to confirm quarantine completion.');
    }
  };

  const handleEvaluateGate = async () => {
    try {
      await evaluateGateMutation.mutateAsync();
      message.success('Clearance gate re-evaluated successfully.');
    } catch {
      message.error('Failed to evaluate clearance gate.');
    }
  };

  const isLoading = loadingSubmissions || loadingQuarantines || loadingAuthorities || loadingStatus;

  return (
    <Flex vertical gap={28} className="max-w-[1240px] pb-16">
      {/* Page Header */}
      <PageHeader
        title="Authorities & Submissions"
        summary="Transport Specialist: File dossiers with veterinary and border customs authorities, track approvals against committed SLAs, and record quarantine inspections."
        right={
          <Flex gap={8} wrap="wrap">
            <Button
              variant="secondary"
              size="sm"
              leadingIcon="history"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leadingIcon="plus"
              onClick={handleOpenQuarantineModal}
            >
              Schedule quarantine
            </Button>
            <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
              <SendOutlined className="mr-1" /> Record submission
            </Button>
          </Flex>
        }
      />

      {/* Transport Job Selector */}
      <div className="flex flex-col gap-2 rounded-lg border border-line bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="type-label-s text-ink-2">Transport job:</span>
          <Select
            showSearch
            placeholder="Search by job code or club"
            value={jobId ?? undefined}
            onChange={(val) => setJobId(val ?? null)}
            onSearch={setJobSearch}
            loading={loadingJobs}
            options={clearanceJobs.map((j: JobSummary) => ({
              label: `${j.code} · ${j.clubName ? j.clubName + ' ' : ''}(${j.originCity} → ${j.destinationCity})`,
              value: j.id,
            }))}
            className="w-[380px] sm:w-[460px]"
            size="middle"
          />
        </div>
        <div className="flex items-center gap-2 text-[13px] text-ink-2">
          <span>Crossing route:</span>
          <Tag color="cyan">
            {selectedJob
              ? `${selectedJob.originCity} → ${selectedJob.destinationCity}`
              : (clearanceStatus?.jobCode ?? 'In transit')}
          </Tag>
        </div>
      </div>

      {/* Clearance Gate Status */}
      <ClearanceGate
        state={clearanceStatus?.clearanceReady ? 'clear' : 'locked'}
        title={
          clearanceStatus?.clearanceReady
            ? `Clearance Gate OPEN (${clearanceStatus.jobCode ?? selectedJob?.code ?? 'Job'})`
            : `Clearance Gate LOCKED (${clearanceStatus?.jobCode ?? selectedJob?.code ?? 'Job'})`
        }
        action={
          <Button
            variant="secondary"
            size="sm"
            disabled={evaluateGateMutation.isPending}
            onClick={handleEvaluateGate}
          >
            <ReloadOutlined spin={evaluateGateMutation.isPending} className="mr-1" />
            Re-evaluate gate
          </Button>
        }
      >
        {clearanceStatus?.clearanceReady ? (
          'All required veterinary certificates, customs clearances, and quarantine periods have been completed. The convoy is cleared for departure.'
        ) : clearanceStatus?.outstandingIssues && clearanceStatus.outstandingIssues.length > 0 ? (
          <ul className="m-0 list-disc pl-4 text-[13px] text-bad">
            {clearanceStatus.outstandingIssues.map((issue, idx) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        ) : (
          'Authority filings are in progress or quarantine periods are pending completion before the departure gate can clear.'
        )}
      </ClearanceGate>

      {/* Stat Tiles KPI */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile
          tone="neutral"
          value={stats.total}
          label="Total submissions"
          lead={`Job: ${clearanceStatus?.jobCode ?? 'CBRT-2026-041'}`}
        />
        <StatTile
          tone="info"
          value={stats.withAuthorities}
          label="With the authorities"
          lead="Tracked against SLA"
        />
        <StatTile
          tone="ok"
          value={stats.approved}
          label="Approved & issued"
          lead={`${stats.approved}/${stats.total} dossiers cleared`}
        />
        <StatTile
          tone={stats.overdueCount > 0 ? 'bad' : 'neutral'}
          value={stats.overdueCount}
          label="Overdue SLA / Refused"
          lead={stats.overdueCount > 0 ? 'Requires immediate action' : 'On schedule'}
        />
      </div>

      {/* Authority Dossier Cards Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="type-h4 m-0 text-ink">Authority Dossiers</h2>
            <p className="type-body-s m-0 text-ink-2">
              Each authority on the transport route requires an independent dossier and is tracked
              against its SLA response window.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                checkLateMutation.mutate(undefined, {
                  onSuccess: (count) => {
                    void message.success(
                      count > 0
                        ? `Alerted logistics manager for ${count} overdue dossier(s).`
                        : 'All submissions are currently within their SLA.',
                    );
                  },
                });
              }}
              disabled={checkLateMutation.isPending}
            >
              {checkLateMutation.isPending ? 'Checking...' : 'Check SLA alerts'}
            </Button>
            <span className="type-mono-caption text-ink-3">
              {submissions.length} relevant authorities
            </span>
          </div>
        </div>

        {loadingSubmissions ? (
          <div className="flex justify-center p-12">
            <Spin size="large" />
          </div>
        ) : submissions.length === 0 ? (
          <Panel className="text-center py-12">
            <BankOutlined className="text-4xl text-ink-3 mb-3" />
            <h3 className="type-label-m text-ink mb-1">No authority dossiers found for this job</h3>
            <p className="type-body-s text-ink-2 mb-4">
              Click &quot;Record submission&quot; to log a filing with Veterinary, Customs, or
              Quarantine authorities.
            </p>
            <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
              Record submission
            </Button>
          </Panel>
        ) : (
          <div className="flex flex-col gap-4">
            {submissions.map((sub) => {
              const isOverdue =
                sub.isOverdue ||
                (sub.expectedBy &&
                  dayjs().isAfter(dayjs(sub.expectedBy)) &&
                  sub.status !== 'ISSUED');
              const statusConfig = STATUS_CHIP_CONFIG[sub.status] ?? {
                tone: 'neutral',
                label: sub.status,
              };
              const kindLabel = SUBMISSION_KIND_LABELS[sub.kind] ?? sub.kind;

              return (
                <div
                  key={sub.id}
                  className={`overflow-hidden rounded-lg border bg-card transition-all ${
                    isOverdue ? 'border-bad/60 shadow-sm' : 'border-line'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between border-b border-line">
                    <div className="flex items-start gap-3.5">
                      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-sunken text-primary">
                        <BankOutlined className="text-lg" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="type-h4 text-ink font-semibold">
                            {sub.authority.name}
                          </span>
                          <Tag color="geekblue" className="font-mono text-[11px] uppercase">
                            {sub.authority.countryCode} · {sub.authority.kind}
                          </Tag>
                          {sub.authority.slaDays && (
                            <span className="type-mono-caption text-ink-3">
                              SLA: {sub.authority.slaDays} business days
                            </span>
                          )}
                        </div>
                        <span className="type-body-s text-ink-2">{kindLabel}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                      <Chip tone={isOverdue ? 'bad' : statusConfig.tone}>
                        {isOverdue ? 'Overdue SLA' : statusConfig.label}
                      </Chip>

                      <div className="flex flex-col items-end">
                        <span
                          className={`type-label-s ${isOverdue ? 'text-bad font-semibold' : 'text-ink'}`}
                        >
                          {sub.status === 'ISSUED'
                            ? 'Approved & Issued'
                            : isOverdue
                              ? 'Response overdue'
                              : 'Expected response'}
                        </span>
                        <span className="type-mono-caption text-ink-2">
                          {sub.expectedBy
                            ? dayjs(sub.expectedBy).format('DD MMM YYYY')
                            : 'Not scheduled'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Facts Bar (Sunken) */}
                  <div className="grid grid-cols-2 gap-4 bg-sunken px-6 py-3.5 sm:grid-cols-4 border-b border-line">
                    <div>
                      <span className="type-mono-caption block text-ink-3">Reference No.</span>
                      <span className="type-mono-data text-ink">
                        {sub.referenceNo || '— (Pending)'}
                      </span>
                    </div>
                    <div>
                      <span className="type-mono-caption block text-ink-3">Filed on</span>
                      <span className="type-body-s text-ink">
                        {sub.filedAt ? dayjs(sub.filedAt).format('DD MMM YYYY HH:mm') : 'Not filed'}
                      </span>
                    </div>
                    <div>
                      <span className="type-mono-caption block text-ink-3">Filed by</span>
                      <span className="type-body-s text-ink">
                        {sub.filedByName || 'Transport specialist'}
                      </span>
                    </div>
                    <div>
                      <span className="type-mono-caption block text-ink-3">Result permit</span>
                      <span className="type-body-s text-ink">
                        {sub.resultFileName ? (
                          <span className="text-ok font-medium">{sub.resultFileName}</span>
                        ) : sub.status === 'ISSUED' ? (
                          'Approved electronically'
                        ) : (
                          'Pending issuance'
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Overdue Alert Callout */}
                  {isOverdue && (
                    <div className="p-4 bg-bad/5 border-b border-bad/20">
                      <Callout
                        tone="bad"
                        title="Departure schedule at risk due to overdue authority SLA!"
                      >
                        This authority has not issued a decision within the committed SLA window (
                        {sub.expectedBy
                          ? dayjs(sub.expectedBy).format('DD MMM YYYY')
                          : 'expected date'}
                        ). An urgent escalation has been dispatched to the Logistics Manager.
                      </Callout>
                    </div>
                  )}

                  {/* Card Actions Footer */}
                  <div className="flex items-center justify-between px-6 py-3 bg-card">
                    <span className="type-body-s text-ink-3">
                      {sub.status === 'READY_TO_FILE'
                        ? 'Record official submission reference once lodged with the authority.'
                        : sub.status === 'ISSUED'
                          ? 'Dossier approved and archived in the clearance gate.'
                          : 'Contact office liaison if additional documents or laboratory tests are requested.'}
                    </span>
                    <Flex gap={8}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenUpdateModal(sub)}
                      >
                        Update decision
                      </Button>
                    </Flex>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pre-export Quarantine & Veterinary Inspection Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="type-h4 m-0 text-ink">Pre-export Quarantine & Veterinary Inspection</h2>
            <p className="type-body-s m-0 text-ink-2">
              Mandatory pre-export quarantine period recorded against the destination requirement
              (Cambodia requires at least 7 days before border crossing).
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            leadingIcon="plus"
            onClick={handleOpenQuarantineModal}
          >
            Schedule quarantine
          </Button>
        </div>

        {loadingQuarantines ? (
          <div className="flex justify-center p-8">
            <Spin />
          </div>
        ) : quarantines.length === 0 ? (
          <Panel className="text-center py-8">
            <ExperimentOutlined className="text-3xl text-ink-3 mb-2" />
            <p className="type-body-s text-ink-2 mb-3">
              No quarantine periods scheduled for this job.
            </p>
            <Button variant="secondary" size="sm" onClick={handleOpenQuarantineModal}>
              Schedule quarantine now
            </Button>
          </Panel>
        ) : (
          <div className="flex flex-col gap-4">
            {quarantines.map((q) => {
              const start = dayjs(q.startsOn);
              const end = dayjs(q.endsOn);
              const durationDays = end.diff(start, 'day');
              const isMeetsMin = durationDays >= 7;

              return (
                <Panel
                  key={q.id}
                  title={
                    <div className="flex items-center gap-2">
                      <ExperimentOutlined className="text-primary" />
                      <span>{q.placeName || 'Animal Quarantine Facility'}</span>
                    </div>
                  }
                  extra={
                    <Chip tone={q.isCompleted ? 'ok' : isMeetsMin ? 'info' : 'warn'}>
                      {q.isCompleted
                        ? 'Inspection completed'
                        : isMeetsMin
                          ? 'In progress (Meets 7-day min)'
                          : 'Under minimum duration'}
                    </Chip>
                  }
                  footer={
                    <div className="flex items-center justify-between">
                      <span className="type-body-s text-ink-3">
                        Cambodia entry regulations require at least 7 days in an approved quarantine
                        facility.
                      </span>
                      {!q.isCompleted && (
                        <Popconfirm
                          title="Confirm quarantine completion?"
                          description="Has the station veterinarian inspected the horses and certified them fit for transit?"
                          onConfirm={() => handleCompleteQuarantine(q.id)}
                          okText="Confirm inspection"
                          cancelText="Cancel"
                        >
                          <Button
                            variant="primary"
                            size="sm"
                            leadingIcon="check"
                            disabled={completeQuarantineMutation.isPending}
                          >
                            Confirm veterinary inspection
                          </Button>
                        </Popconfirm>
                      )}
                    </div>
                  }
                >
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 py-2">
                    <div>
                      <span className="type-mono-caption block text-ink-3">Scheduled period</span>
                      <span className="type-mono-data text-ink">
                        {start.format('DD MMM YYYY')} – {end.format('DD MMM YYYY')}
                      </span>
                    </div>
                    <div>
                      <span className="type-mono-caption block text-ink-3">Duration</span>
                      <span className="type-label-s text-ink">{durationDays} days</span>
                    </div>
                    <div>
                      <span className="type-mono-caption block text-ink-3">Regulatory minimum</span>
                      <span className="type-label-s text-ink">7 days (Cambodia GDAHP)</span>
                    </div>
                    <div>
                      <span className="type-mono-caption block text-ink-3">
                        Station veterinarian
                      </span>
                      <span className="type-body-s text-ink">
                        {q.completedAt ? (
                          <span className="text-ok font-medium">
                            Certified on {dayjs(q.completedAt).format('DD MMM YYYY HH:mm')}
                          </span>
                        ) : (
                          'Veterinary supervision in progress'
                        )}
                      </span>
                    </div>
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal 1: Record New Submission */}
      <Modal
        title="Record Authority Submission"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={handleCreateSubmission}
        confirmLoading={createSubmissionMutation.isPending}
        okText="Record submission"
        cancelText="Cancel"
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" className="mt-4">
          <Form.Item
            name="authorityId"
            label="Receiving authority"
            rules={[{ required: true, message: 'Please select an authority' }]}
          >
            <Select
              placeholder="Select authority (Customs, Veterinary, GDAHP...)"
              options={authorities.map((a) => ({
                label: `${a.name} (${a.countryCode} · ${a.kind} · SLA ${a.slaDays} days)`,
                value: a.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="kind"
            label="Dossier type"
            rules={[{ required: true, message: 'Please select a dossier type' }]}
          >
            <Select
              options={Object.entries(SUBMISSION_KIND_LABELS).map(([key, label]) => ({
                label,
                value: key,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="referenceNo"
            label="Filing reference / Receipt number"
            help="e.g., RAHO6-EXP-2026-081 or HQ-MB-2026-18842"
          >
            <Input placeholder="Enter reference number issued by the authority" />
          </Form.Item>

          <Form.Item
            name="expectedBy"
            label="Expected decision date (SLA)"
            rules={[{ required: true, message: 'Please select expected date' }]}
          >
            <DatePicker className="w-full" format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal 2: Update Submission Status */}
      <Modal
        title={`Update Decision: ${selectedSubmission?.authority?.name ?? 'Authority'}`}
        open={updateModalOpen}
        onCancel={() => setUpdateModalOpen(false)}
        onOk={handleUpdateSubmission}
        confirmLoading={updateSubmissionMutation.isPending}
        okText="Save decision"
        cancelText="Cancel"
        destroyOnClose
      >
        <Form form={updateForm} layout="vertical" className="mt-4">
          <Form.Item
            name="status"
            label="Authority decision / Status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select
              options={[
                { label: 'Approved & Issued (ISSUED)', value: 'ISSUED' },
                { label: 'With the authority (FILED)', value: 'FILED' },
                {
                  label: 'Additional information requested (ADDITIONAL_INFO)',
                  value: 'ADDITIONAL_INFO',
                },
                { label: 'Refused / Rejected (REFUSED)', value: 'REFUSED' },
              ]}
            />
          </Form.Item>

          <Form.Item name="referenceNo" label="Official permit / Decision reference number">
            <Input placeholder="Permit number or official dispatch reference" />
          </Form.Item>

          <Form.Item name="expectedBy" label="Revised response date (if rescheduled)">
            <DatePicker className="w-full" format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal 3: Create Quarantine Period */}
      <Modal
        title="Schedule Pre-Export Quarantine Period"
        open={quarantineModalOpen}
        onCancel={() => setQuarantineModalOpen(false)}
        onOk={handleCreateQuarantine}
        confirmLoading={createQuarantineMutation.isPending}
        okText="Schedule quarantine"
        cancelText="Cancel"
        destroyOnClose
      >
        <Form form={quarantineForm} layout="vertical" className="mt-4">
          <Form.Item
            name="placeId"
            label="Quarantine facility"
            rules={[{ required: true, message: 'Please select a facility' }]}
          >
            <Select
              loading={loadingStations}
              options={quarantineStations.map((s: { id: string; name: string; city?: string }) => ({
                label: `${s.name}${s.city ? ` (${s.city})` : ''}`,
                value: s.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="dates"
            label="Quarantine window (Minimum 7 days required)"
            rules={[{ required: true, message: 'Please select start and end dates' }]}
          >
            <DatePicker.RangePicker className="w-full" format="DD/MM/YYYY" />
          </Form.Item>

          <Alert
            type="info"
            showIcon
            message="Cambodia GDAHP Veterinary Regulation"
            description="All horses must complete at least 7 days of certified pre-export quarantine before crossing the Bavet border."
          />
        </Form>
      </Modal>
    </Flex>
  );
};

export default AuthoritiesPage;
