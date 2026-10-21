import type { FC } from 'react';
import { Button, Callout, ClearanceGate, StatTile } from '@/components/ui';
import { useEvaluateClearanceGate } from '@/hooks/clearance';
import type { ClearanceStatus } from '@/interfaces';

/** The job's clearance gate, its counts and what still holds departure. */
const ClearanceSummary: FC<{ jobId: string; status: ClearanceStatus }> = ({ jobId, status }) => {
  const evaluateGate = useEvaluateClearanceGate(jobId);
  const remaining = Math.max(0, status.mandatoryItems - status.clearedMandatoryItems);

  return (
    <>
      <ClearanceGate
        state={status.clearanceReady ? 'clear' : 'locked'}
        title={status.clearanceReady ? 'Clear to depart' : 'Departure locked'}
        action={
          <Button
            variant="secondary"
            size="sm"
            disabled={evaluateGate.isPending}
            // A failure shows in the mutation's state; the gate keeps its last result.
            onClick={() => evaluateGate.mutateAsync(jobId).catch(() => undefined)}
          >
            {evaluateGate.isPending ? 'Evaluating...' : 'Re-evaluate gate'}
          </Button>
        }
      >
        {status.clearanceReady
          ? 'Every mandatory document is approved and GREEN, quarantines are complete and every permit is issued.'
          : `${status.clearedMandatoryItems} of ${status.mandatoryItems} mandatory documents cleared · ${status.outstandingIssues.length} outstanding.`}
      </ClearanceGate>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile tone="neutral" label="Checklist items" value={status.totalChecklistItems} />
        <StatTile tone="ok" label="Mandatory cleared" value={status.clearedMandatoryItems} />
        <StatTile tone="warn" label="Mandatory remaining" value={remaining} />
        <StatTile
          tone={status.outstandingIssues.length > 0 ? 'bad' : 'ok'}
          label="Outstanding"
          value={status.outstandingIssues.length}
        />
      </div>

      {status.outstandingIssues.length > 0 && (
        <Callout tone="bad" title="What holds departure">
          <ul className="mt-1 list-inside list-disc space-y-1 text-ink-2">
            {status.outstandingIssues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
        </Callout>
      )}
    </>
  );
};

export default ClearanceSummary;
