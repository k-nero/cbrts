import type { FC } from 'react';

import { Button, ClearanceGate } from '@/components/ui';
import type { JobDetail } from '@/interfaces';

/**
 * The clearance gate (DESIGN.md, Clearance Gate): Clear to depart or Departure locked, the gate's own sentence, and
 * while it is locked a Secondary that leads to the outstanding items. The trip shown's gate on the Trip tab, where a
 * domestic leg before the border is clear early; the dossier's own on the job-wide tabs, the same for every trip.
 */
export const JobGate: FC<{
  job: JobDetail;
  /** The dossier's gate rather than the trip shown's. */
  dossier?: boolean;
  onOpenClearance: (() => void) | null;
}> = ({ job, dossier = false, onOpenClearance }) => {
  const state = dossier ? job.dossierGateState : job.clearanceGateState;
  const summary = dossier ? job.dossierGateSummary : job.clearanceGateSummary;
  return (
    <ClearanceGate
      state={state === 'Clear' ? 'clear' : 'locked'}
      action={
        state !== 'Clear' &&
        onOpenClearance && (
          <Button
            variant="secondary"
            size="md"
            trailingIcon="arrow-right"
            onClick={onOpenClearance}
          >
            View outstanding items
          </Button>
        )
      }
    >
      {summary}
    </ClearanceGate>
  );
};
