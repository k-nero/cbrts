import type { FC } from 'react';

import { routeStops } from './tracking';

import { cx, Icon, Panel } from '@/components/ui';
import type { TripView } from '@/interfaces';

/**
 * The route as recorded (Figma "Tracking · Delivered", side column): the clearance, then every stop with the
 * time its checkpoint was recorded, then how the trip went against the plan.
 */
export const RouteRecord: FC<{ trip: TripView }> = ({ trip }) => {
  const stops = routeStops(trip);
  const late = trip.handover?.lateMinutes;
  const held = trip.records.some((r) => r.kind === 'HELD');
  const facts: [string, string][] = [
    ['On time', late == null ? 'Yes' : late > 0 ? `${late} min after plan` : 'Yes, ahead of plan'],
  ];
  if (trip.stops.some((s) => s.kind === 'BORDER'))
    facts.push(['Border', held ? 'Cleared after a hold' : 'Cleared, no hold']);
  else if (held) facts.push(['Holds', 'Held on the way, then cleared']);
  if (trip.parts.length > 1) facts.push(['Trips', `${trip.parts.length}, handed on between them`]);
  return (
    <Panel title="Route">
      <div className="flex flex-col gap-5">
        <p className="type-body-s m-0 text-ink-3">
          Completed. Every checkpoint was recorded by the escort.
        </p>
        <ol className="m-0 flex list-none flex-col p-0">
          <li className="flex items-start gap-3 pb-3">
            <Icon name="unlock" size={14} className="mt-0.5 text-ok" />
            <span className="flex flex-col gap-0.5">
              <span className="type-label-s text-ink">Clearance</span>
              <span className="type-mono-label text-ink-3">Clear to depart</span>
            </span>
          </li>
          {stops.map((s, i) => (
            <li key={`${String(s.name)}-${i}`} className="relative flex items-start gap-3 pb-3">
              {i < stops.length - 1 && (
                <span aria-hidden className="absolute top-3 bottom-0 left-[5px] w-0.5 bg-ok" />
              )}
              <span
                aria-hidden
                className={cx(
                  'relative mt-1 size-3 shrink-0 rounded-full',
                  s.state === 'done' ? 'bg-ok' : 'border-2 border-line-strong bg-card',
                )}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="type-label-s text-ink">{s.name}</span>
                <span className="type-mono-label text-ink-3">{s.kind}</span>
              </span>
              <span className="type-data text-ink-3">{String(s.time).split(' · ')[0]}</span>
            </li>
          ))}
        </ol>
        <dl className="m-0 flex flex-col border-t border-line">
          {facts.map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between gap-4 border-b border-line py-2.5 last:border-b-0"
            >
              <dt className="type-body-s text-ink-3">{label}</dt>
              <dd className="type-label-s m-0 text-right text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Panel>
  );
};
