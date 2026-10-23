import { formatClock, formatTrailerDuration, formatUnloadBy } from '../tripFormat';

import { Button, Callout, Icon, Panel } from '@/components/ui';
import type { TripView } from '@/interfaces';
import { TripRecordKindEnum } from '@/interfaces';

type Props = {
  trip: TripView;
  userName?: string;
  onLogWaterOrCheck: () => void;
  onCallManager?: () => void;
};

export function EscortHeldView({
  trip,
  userName = 'Tùng, driver',
  onLogWaterOrCheck,
  onCallManager,
}: Props) {
  // Find held stop and departure stop
  const heldStop =
    trip.stops.find((s) => s.latestStatus === TripRecordKindEnum.HELD) ??
    trip.stops.find((s) => s.kind === 'BORDER') ??
    trip.stops[1] ??
    trip.stops[0];

  const pickupStop = trip.stops.find((s) => s.kind === 'PICKUP') ?? trip.stops[0];

  // Held record and departed record
  const heldRecord =
    trip.records.find((r) => r.kind === TripRecordKindEnum.HELD) ??
    trip.records[trip.records.length - 1];

  const departedRecord = trip.records.find((r) => r.kind === TripRecordKindEnum.DEPARTED);

  const loadedTime = formatClock(departedRecord?.occurredAt ?? trip.plannedDepartureAt ?? '05:30');
  const heldTime = formatClock(heldRecord?.occurredAt ?? trip.plannedDepartureAt ?? '08:12');
  const departedDate = departedRecord?.occurredAt ?? trip.plannedDepartureAt;

  const durationOnTrailer = formatTrailerDuration(departedDate);
  const unloadByTime = formatUnloadBy(departedDate, 6);

  const horseName = trip.horses[0]?.name ?? 'Mekong Star';
  const stopName = heldStop?.name ?? 'Bavet – Mộc Bài';

  const defaultRecordText =
    heldRecord?.text ||
    `${stopName} is closed to vehicles over 10 t until 16:00 for a bridge inspection. We are parked in the Bavet exit lane. ${horseName} is settled.`;

  const recordedByText = heldRecord?.recordedBy || userName || 'Tùng, driver';

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      {/* Main Task Panel (8 cols) */}
      <div className="flex flex-col gap-6 lg:col-span-8">
        <Panel>
          <div className="flex flex-col gap-5 p-2">
            {/* Title & Subtitle */}
            <div className="flex flex-col gap-1.5">
              <h2 className="type-h3 m-0 text-ink">Held at {stopName}</h2>
              <p className="type-body-s m-0 text-ink-2">
                {stopName} is closed to heavy vehicles until 16:00. You recorded the hold at{' '}
                {heldTime}.
              </p>
            </div>

            {/* Info Callout */}
            <Callout tone="info" title={`Yến was alerted at ${heldTime} and is deciding`}>
              She’ll choose between waiting, re-routing via Xa Mát or returning, and call you. Stay
              in the exit lane. Unload only if {horseName} needs it.
            </Callout>

            {/* Clock / Trailer Duration Warning Banner */}
            <div className="flex items-center gap-6 rounded-xl border border-warn bg-warn-soft/30 p-5">
              <span className="type-mono-data text-3xl font-bold tracking-tight text-warn">
                {durationOnTrailer}
              </span>
              <div className="flex flex-col gap-1">
                <span className="type-label-m font-semibold text-ink">
                  On the trailer since {loadedTime}
                </span>
                <span className="type-body-s text-ink-2">
                  Unload to rest by {unloadByTime}: at least every 6 hours.
                </span>
              </div>
            </div>

            {/* While you wait action buttons */}
            <div className="flex flex-wrap gap-3 pt-1">
              <Button
                variant="secondary"
                leadingIcon="plus"
                onClick={onLogWaterOrCheck}
                className="h-14 flex-1 text-base font-medium"
              >
                Log water or a check
              </Button>
              <Button
                variant="secondary"
                leadingIcon="phone"
                onClick={onCallManager}
                className="h-14 flex-1 text-base font-medium"
              >
                Call Yến
              </Button>
            </div>
          </div>
        </Panel>
      </div>

      {/* Right Column (4 cols) */}
      <div className="flex flex-col gap-4 lg:col-span-4">
        {/* What you recorded */}
        <Panel title="What you recorded">
          <div className="flex flex-col gap-3">
            <p className="type-body-s m-0 text-ink">“{defaultRecordText}”</p>
            <div className="flex items-center gap-2 border-t border-line pt-2 text-ink-3">
              <span className="type-mono-data text-xs text-ink-2">{heldTime}</span>
              <span className="type-caption">{recordedByText} · sent</span>
            </div>
          </div>
        </Panel>

        {/* What the customer sees */}
        <Panel title="What the customer sees">
          <p className="type-body-s m-0 text-ink-2">
            “Held at {stopName} since {heldTime}”, and Yến’s message once she decides. Never a
            guessed arrival time.
          </p>
        </Panel>
      </div>
    </div>
  );
}
