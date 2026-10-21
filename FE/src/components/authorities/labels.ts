import type { Tone } from '@/components/ui';
import {
  type AuthorityKind,
  AuthorityKindEnum,
  type SubmissionKind,
  SubmissionKindEnum,
  type SubmissionStatus,
  SubmissionStatusEnum,
} from '@/interfaces';

export const SUBMISSION_KIND_LABELS: Record<SubmissionKind, string> = {
  [SubmissionKindEnum.EXPORT_HEALTH_CERTS]: 'Export Health Certificates (DAH / RAHO)',
  [SubmissionKindEnum.CUSTOMS_DOSSIER]: 'Border Customs Export/Import Dossier',
  [SubmissionKindEnum.IMPORT_PERMIT]: 'Live Equine Import Permit (GDAHP)',
};

export const AUTHORITY_KIND_LABELS: Record<AuthorityKind, string> = {
  [AuthorityKindEnum.VETERINARY]: 'Veterinary',
  [AuthorityKindEnum.CUSTOMS]: 'Customs',
  [AuthorityKindEnum.QUARANTINE]: 'Quarantine',
};

export const SUBMISSION_STATUS_CHIPS: Record<SubmissionStatus, { tone: Tone; label: string }> = {
  [SubmissionStatusEnum.READY_TO_FILE]: { tone: 'warn', label: 'Ready to file' },
  [SubmissionStatusEnum.FILED]: { tone: 'info', label: 'With the authority' },
  [SubmissionStatusEnum.ADDITIONAL_INFO]: { tone: 'warn', label: 'Action required' },
  [SubmissionStatusEnum.ISSUED]: { tone: 'ok', label: 'Approved' },
  [SubmissionStatusEnum.REFUSED]: { tone: 'bad', label: 'Refused' },
};

/** The decisions staff record from the authority's reply (READY_TO_FILE is where a filing starts). */
export const DECISION_OPTIONS: { label: string; value: SubmissionStatus }[] = [
  { label: 'Approved and issued', value: SubmissionStatusEnum.ISSUED },
  { label: 'With the authority', value: SubmissionStatusEnum.FILED },
  { label: 'Additional information requested', value: SubmissionStatusEnum.ADDITIONAL_INFO },
  { label: 'Refused', value: SubmissionStatusEnum.REFUSED },
];

/** "7 days (Cambodia import)", or null before the job is pinned to a catalog. */
export const quarantineRule = (minDays?: number, destination?: string) =>
  minDays === undefined || minDays === null
    ? null
    : `${minDays} days${destination ? ` (${destination})` : ''}`;
