import type { FC } from 'react';

import { Button, ClearanceGate } from '@/components/ui';
import type { JobDetail } from '@/interfaces';

/**
 * The clearance gate for the trip shown (DESIGN.md, Clearance Gate): Clear to depart or Departure locked, the gate's
 * own sentence, and while it is locked a Secondary that leads to the outstanding items.
 */
export const JobGate: FC<{ job: JobDetail; onOpenClearance: (() => void) | null }> = ({
  job,
  onOpenClearance,
}) => (
  <ClearanceGate
    state={job.clearanceGateState === 'Clear' ? 'clear' : 'locked'}
    action={
      job.clearanceGateState !== 'Clear' &&
      onOpenClearance && (
        <Button variant="secondary" size="md" trailingIcon="arrow-right" onClick={onOpenClearance}>
          View outstanding items
        </Button>
      )
    }
  >
    {job.clearanceGateSummary}
  </ClearanceGate>
);
