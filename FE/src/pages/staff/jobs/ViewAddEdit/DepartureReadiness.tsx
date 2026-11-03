import type { FC } from 'react';

import { nextStep, type ReadinessState, type ReadinessStep, stepOwner } from './readiness';
import { RecordDepartureButton } from './RecordDepartureButton';
import { SignOffButton } from './SignOffButton';

import { Button, Chip, Panel } from '@/components/ui';
import type { Tone } from '@/components/ui/tone';
import { useCanPlanTrips, useCanSignOffTripPlan } from '@/hooks/useJob';
import type { JobDetail, TripPart } from '@/interfaces';

const STATE: Record<ReadinessState, { tone: Tone; word: string }> = {
  done: { tone: 'ok', word: 'Done' },
  todo: { tone: 'warn', word: 'To do' },
  locked: { tone: 'bad', word: 'Locked' },
  waiting: { tone: 'neutral', word: 'Waiting' },
};

type Props = {
  job: JobDetail;
  part: TripPart | null;
  steps: ReadinessStep[];
  onOpenLoadPlan: () => void;
  onOpenClearance: () => void;
};

/**
 * Ready to depart (Trip tab, Route view): what the trip still needs before it leaves, each step a state in tone
 * plus word, what was found, and who holds it. The one gold action is the first open step's, so Record departure
 * is gold only once every step is done; before that it is a disabled Secondary that names what it waits on.
 */
export const DepartureReadiness: FC<Props> = ({
  job,
  part,
  steps,
  onOpenLoadPlan,
  onOpenClearance,
}) => {
  const canPlan = useCanPlanTrips();
  const canSignOff = useCanSignOffTripPlan();
  const next = nextStep(steps);
  const done = steps.filter((s) => s.state === 'done').length;

  const owner = (s: ReadinessStep) => stepOwner(job, s);

  // The first open step's action, gold when it is the viewer's to do. The clearance hand-off isn't here: it sits on
  // the Clearance row while the gate is open, the only place the Route view shows what is outstanding.
  const action = (() => {
    if (!next) return null;
    // A flight has no load plan, and its flight crew are assigned on the same page, above.
    if ((next.action === 'load-plan' || next.action === 'crew') && canPlan && part?.mode !== 'AIR')
      return (
        <Button variant="primary" size="md" trailingIcon="arrow-right" onClick={onOpenLoadPlan}>
          {next.action === 'crew' ? 'Assign the crew' : 'Open the load plan'}
        </Button>
      );
    if (next.action === 'sign-off' && canSignOff) return <SignOffButton job={job} />;
    return null;
  })();

  const footer = next ? (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <span className="type-body-s text-ink-2">
        {next.key === 'route'
          ? 'Confirm the draft route above first.'
          : `Waiting on ${next.label.toLowerCase()} · ${owner(next)}.`}
      </span>
      <span className="flex flex-wrap items-center gap-3">
        {action}
        <Button
          variant="secondary"
          size="md"
          leadingIcon="lock"
          disabled
          title={`Opens when every step is done; waiting on ${next.label.toLowerCase()}.`}
        >
          Record departure
        </Button>
      </span>
    </div>
  ) : (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <span className="type-body-s text-ink-2">
        Every step is done. Departure records the time now and freezes the documents.
      </span>
      <RecordDepartureButton job={job} part={part} />
    </div>
  );

  return (
    <Panel
      flush
      title="Ready to depart"
      extra={
        <span className="type-data text-ink-3">
          {done} of {steps.length} done
        </span>
      }
      footer={footer}
    >
      <ul className="m-0 list-none divide-y divide-line p-0" aria-label="Ready to depart">
        {steps.map((s) => (
          <li key={s.key} className="grid grid-cols-[88px_1fr_auto] items-start gap-4 px-6 py-3.5">
            <Chip tone={STATE[s.state].tone}>{STATE[s.state].word}</Chip>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="type-label-m text-ink">{s.label}</span>
              <span className="type-body-s text-ink-2">{s.detail}</span>
              {s.key === 'clearance' && s.state !== 'done' && (
                <span className="mt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    trailingIcon="arrow-right"
                    onClick={onOpenClearance}
                  >
                    View outstanding items
                  </Button>
                </span>
              )}
            </span>
            <span className="type-body-s text-ink-3 text-right">{owner(s)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
};
