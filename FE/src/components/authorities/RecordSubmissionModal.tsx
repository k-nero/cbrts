import type { FC } from 'react';

import { RecordSubmissionForm } from './RecordSubmissionForm';

import BaseModal from '@/components/modal/BaseModal';

type Props = { open: boolean; jobId: string | null; onClose: () => void };

/** Log a dossier filed with an authority, with the date its decision is due under the SLA. */
const RecordSubmissionModal: FC<Props> = ({ open, jobId, onClose }) => (
  <BaseModal open={open} onCancel={onClose} title="Record Authority Submission">
    {/* Mounted per open (BaseModal destroys hidden content), so the form starts from its defaults. */}
    {open && <RecordSubmissionForm jobId={jobId} onClose={onClose} />}
  </BaseModal>
);

export default RecordSubmissionModal;
