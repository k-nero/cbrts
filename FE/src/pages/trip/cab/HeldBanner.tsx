import { formatTrailerDuration, formatUnloadBy } from '../tripFormat';

import { Button, Callout } from '@/components/ui';

type Props = {
  heldTime?: string;
  loadedTime?: string;
  departedAt?: string | null;
  onLogWaterOrCheck?: () => void;
  onCallManager?: () => void;
};

export function HeldBanner({
  heldTime = '08:12',
  loadedTime = '05:30',
  departedAt,
  onLogWaterOrCheck,
  onCallManager,
}: Props) {
  const durationText = departedAt ? formatTrailerDuration(departedAt) : '3 h 25 min';
  const unloadByText = departedAt ? formatUnloadBy(departedAt) : '11:30';

  return (
    <div className="flex flex-col gap-4">
      <Callout
        tone="warn"
        title={`Logistics was alerted at ${heldTime} and is reviewing this hold`}
      >
        Waiting on decision between border clearance, re-routing, or rest stop. Stay parked safely.
        Unload only if horse welfare requires it.
      </Callout>

      <div className="flex items-center gap-6 rounded-xl border border-warn bg-warn-soft/30 p-5">
        <span className="type-mono-data text-3xl font-bold text-warn">{durationText}</span>
        <div className="flex flex-col gap-1">
          <span className="type-label-m text-ink">On the trailer since {loadedTime}</span>
          <span className="type-body-s text-ink-2">
            Unload to rest mandatory by {unloadByText}: at least every 6 hours.
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          leadingIcon="plus"
          onClick={onLogWaterOrCheck}
          className="h-12 flex-1"
        >
          Log water or welfare check
        </Button>
        <Button
          variant="secondary"
          leadingIcon="arrow-right"
          onClick={onCallManager}
          className="h-12 flex-1"
        >
          Call Logistics Manager
        </Button>
      </div>
    </div>
  );
}
