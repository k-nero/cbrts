import type { Tone } from '@/components/ui';
import {
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

export const SUBMISSION_STATUS_CHIPS: Record<SubmissionStatus, { tone: Tone; label: string }> = {
  [SubmissionStatusEnum.READY_TO_FILE]: { tone: 'warn', label: 'Ready to file' },
  [SubmissionStatusEnum.FILED]: { tone: 'info', label: 'With the authority' },
  [SubmissionStatusEnum.ADDITIONAL_INFO]: { tone: 'warn', label: 'Action required' },
  [SubmissionStatusEnum.ISSUED]: { tone: 'ok', label: 'Approved' },
  [SubmissionStatusEnum.REFUSED]: { tone: 'bad', label: 'Refused' },
};

/** The minimum pre-export quarantine the page checks against (shown as the Cambodia GDAHP rule). */
export const QUARANTINE_MIN_DAYS = 7;
