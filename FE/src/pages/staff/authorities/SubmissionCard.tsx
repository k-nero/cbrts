import type { FC } from 'react';
import { BankOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Button, Callout, Chip } from '@/components/ui';
import { type AuthoritySubmission, SubmissionStatusEnum } from '@/interfaces';
import { AUTHORITY_KIND_LABELS, SUBMISSION_KIND_LABELS, SUBMISSION_STATUS_CHIPS } from './labels';

/** One authority's dossier: who, what, its SLA date, the filing facts and the next step. */
const SubmissionCard: FC<{
  submission: AuthoritySubmission;
  onUpdate: (submission: AuthoritySubmission) => void;
}> = ({ submission: sub, onUpdate }) => {
  const isOverdue =
    sub.isOverdue ||
    (sub.expectedBy &&
      dayjs().isAfter(dayjs(sub.expectedBy)) &&
      sub.status !== SubmissionStatusEnum.ISSUED);
  const statusChip = SUBMISSION_STATUS_CHIPS[sub.status] ?? { tone: 'neutral', label: sub.status };
  const expected = sub.expectedBy ? dayjs(sub.expectedBy).format('DD MMM YYYY') : null;

  return (
    <div
      className={`overflow-hidden rounded-lg border bg-card transition-all ${
        isOverdue ? 'border-bad/60 shadow-sm' : 'border-line'
      }`}
    >
      <div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-sunken text-primary">
            <BankOutlined className="text-lg" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="type-h4 font-semibold text-ink">{sub.authority.name}</span>
              <Chip tone="neutral" dot={false}>
                {sub.authority.countryCode} · {AUTHORITY_KIND_LABELS[sub.authority.kind]}
              </Chip>
              {sub.authority.slaDays && (
                <span className="type-mono-caption text-ink-3">
                  SLA: {sub.authority.slaDays} business days
                </span>
              )}
            </div>
            <span className="type-body-s text-ink-2">
              {SUBMISSION_KIND_LABELS[sub.kind] ?? sub.kind}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:justify-end">
          <Chip tone={isOverdue ? 'bad' : statusChip.tone}>
            {isOverdue ? 'Overdue SLA' : statusChip.label}
          </Chip>
          <div className="flex flex-col items-end">
            <span className={`type-label-s ${isOverdue ? 'font-semibold text-bad' : 'text-ink'}`}>
              {sub.status === SubmissionStatusEnum.ISSUED
                ? 'Approved & Issued'
                : isOverdue
                  ? 'Response overdue'
                  : 'Expected response'}
            </span>
            <span className="type-mono-caption text-ink-2">{expected ?? 'Not scheduled'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-b border-line bg-sunken px-6 py-3.5 sm:grid-cols-4">
        <div>
          <span className="type-mono-caption block text-ink-3">Reference No.</span>
          <span className="type-mono-data text-ink">{sub.referenceNo || '— (Pending)'}</span>
        </div>
        <div>
          <span className="type-mono-caption block text-ink-3">Filed on</span>
          <span className="type-body-s text-ink">
            {sub.filedAt ? dayjs(sub.filedAt).format('DD MMM YYYY HH:mm') : 'Not filed'}
          </span>
        </div>
        <div>
          <span className="type-mono-caption block text-ink-3">Filed by</span>
          <span className="type-body-s text-ink">{sub.filedByName || 'Transport specialist'}</span>
        </div>
        <div>
          <span className="type-mono-caption block text-ink-3">Result permit</span>
          <span className="type-body-s text-ink">
            {sub.resultFileName ? (
              <span className="font-medium text-ok">{sub.resultFileName}</span>
            ) : sub.status === SubmissionStatusEnum.ISSUED ? (
              'Approved electronically'
            ) : (
              'Pending issuance'
            )}
          </span>
        </div>
      </div>

      {isOverdue && (
        <div className="border-b border-bad/20 bg-bad/5 p-4">
          <Callout tone="bad" title="The authority's decision is overdue">
            No decision has arrived within the SLA window
            {expected ? ` (due ${expected})` : ''}. Chase the authority, and tell the logistics
            manager if it puts the departure date at risk.
          </Callout>
        </div>
      )}

      <div className="flex items-center justify-between bg-card px-6 py-3">
        <span className="type-body-s text-ink-3">
          {sub.status === SubmissionStatusEnum.READY_TO_FILE
            ? 'Record official submission reference once lodged with the authority.'
            : sub.status === SubmissionStatusEnum.ISSUED
              ? 'Dossier approved and archived in the clearance gate.'
              : 'Contact office liaison if additional documents or laboratory tests are requested.'}
        </span>
        <Button variant="secondary" size="sm" onClick={() => onUpdate(sub)}>
          Update decision
        </Button>
      </div>
    </div>
  );
};

export default SubmissionCard;
