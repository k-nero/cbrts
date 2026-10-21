import { type FC } from 'react';

import { ScheduleQuarantineForm } from './ScheduleQuarantineForm';

import BaseModal from '@/components/modal/BaseModal';

export type Props = {
  open: boolean;
  jobId: string | null;
  /** The pinned destination catalog's minimum stay; the server refuses a shorter period either way. */
  minDays?: number;
  destination?: string;
  onClose: () => void;
};

/** Schedule a pre-export quarantine period at an approved facility. */
const ScheduleQuarantineModal: FC<Props> = ({ open, onClose, ...rest }) => (
  <BaseModal open={open} onCancel={onClose} title="Schedule Pre-Export Quarantine Period">
    {/* Mounted per open (BaseModal destroys hidden content), so the window starts from today. */}
    {open && <ScheduleQuarantineForm {...rest} onClose={onClose} />}
  </BaseModal>
);

export default ScheduleQuarantineModal;
