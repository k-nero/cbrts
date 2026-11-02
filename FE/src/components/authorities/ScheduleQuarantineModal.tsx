import { type FC } from 'react';

import { ScheduleQuarantineForm } from './ScheduleQuarantineForm';

import BaseModal from '@/components/modal/BaseModal';
import type { QuarantinePeriod } from '@/interfaces';

export type Props = {
  open: boolean;
  jobId: string | null;
  /** The pinned destination catalog's minimum stay; the server refuses a shorter period either way. */
  minDays?: number;
  destination?: string;
  /** The scheduled quarantine being changed; absent when scheduling a new one. */
  editing?: QuarantinePeriod | null;
  onClose: () => void;
};

/** Schedule a pre-export quarantine period at an approved facility, or change a scheduled one. */
const ScheduleQuarantineModal: FC<Props> = ({ open, onClose, ...rest }) => (
  <BaseModal
    open={open}
    onCancel={onClose}
    title={rest.editing ? 'Change Quarantine Period' : 'Schedule Pre-Export Quarantine Period'}
  >
    {/* Mounted per open (BaseModal destroys hidden content), so the window starts from today. */}
    {open && <ScheduleQuarantineForm {...rest} onClose={onClose} />}
  </BaseModal>
);

export default ScheduleQuarantineModal;
