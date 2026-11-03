import type { FC, ReactNode } from 'react';

import { firstBorder, passStub, trackingStage } from './tracking';
import { HorseSwatches } from '../components/HorseSwatches';

import { Icon, Perforation, StageMark } from '@/components/ui';
import type { Horse, TransportRequest, TripView } from '@/interfaces';
import { formatTime, ict } from '@/lib/utils';

type Props = { request: TransportRequest; trip: TripView; horses: Horse[]; now: string };

const Fact: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <div className="flex min-w-0 flex-col gap-1.5">
    <dt className="type-body-s text-ink-3">{label}</dt>
    <dd className="m-0 truncate">{children}</dd>
  </div>
);

const City: FC<{ code: string | null; city: string; align: 'start' | 'end' }> = ({
  code,
  city,
  align,
}) => (
  <div className={`flex min-w-0 flex-col gap-1 ${align === 'end' ? 'items-end text-right' : ''}`}>
    <span className="type-mono-label text-ink-3">{code ?? ' '}</span>
    <span className="type-display-m truncate text-ink">{city}</span>
  </div>
);

/**
 * The pass header (DESIGN.md, The pass header; Figma "Tracking · In transit", "Delivered"): the REQ and CBRT
 * codes with the stage mark, the two cities with the mode between, the facts that matter, a perforation, and a
 * sunken stub that says the one thing that matters now.
 */
export const TrackingPass: FC<Props> = ({ request, trip, horses, now }) => {
  const from = request.origin?.city ?? trip.parts[0]?.startCity ?? trip.origin ?? 'Origin';
  const to =
    request.destination?.city ?? trip.parts.at(-1)?.endCity ?? trip.destination ?? 'Destination';
  const air = trip.flights.length > 0 || trip.parts.some((p) => p.mode === 'AIR');
  const stub = passStub(trip, now);
  const border = firstBorder(trip);
  const ids = request.horses.map((h) => h.horseId);
  return (
    <section
      aria-label="Your move"
      className="grid overflow-hidden rounded-xl border border-line bg-card shadow-card lg:grid-cols-[minmax(0,1fr)_auto_240px]"
    >
      <div className="flex min-w-0 flex-col gap-4 px-6 pt-5 pb-5">
        <div className="flex items-center justify-between gap-4">
          <span className="type-data text-ink-2">
            {request.code}
            {request.jobCode ? ` · ${request.jobCode}` : ''}
          </span>
          <StageMark stage={trackingStage(trip)} />
        </div>
        <div className="flex items-end gap-5">
          <City code={request.origin?.countryCode ?? null} city={from} align="start" />
          <span aria-hidden className="mb-3 flex min-w-16 flex-1 items-center gap-3">
            <span className="h-px flex-1 bg-line-strong" />
            <Icon name={air ? 'plane' : 'truck'} size={18} className="text-ink-2" />
            <span className="h-px flex-1 bg-line-strong" />
          </span>
          <City code={request.destination?.countryCode ?? null} city={to} align="end" />
        </div>
        <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-4 md:grid-cols-5">
          <Fact label="Departs">
            <span className="type-data text-ink">
              {trip.plannedDepartureAt
                ? `${ict(trip.plannedDepartureAt).format('D MMM')} · ${formatTime(trip.plannedDepartureAt)}`
                : '—'}
            </span>
          </Fact>
          <Fact label="Horses">
            <HorseSwatches ids={ids} horses={horses} />
          </Fact>
          <Fact label={air ? 'Flight' : 'Border'}>
            <span className="type-label-s text-ink">
              {air
                ? trip.flights[0]
                  ? `${trip.flights[0].airline} ${trip.flights[0].flightNo}`
                  : 'To be booked'
                : (border ?? 'No crossing')}
            </span>
          </Fact>
          <Fact label="Trailer">
            <span className="type-data text-ink">
              {trip.vehicleCode ?? '—'}
              {trip.vehicleCode ? (trip.shared ? ' · shared' : ' · private') : ''}
            </span>
          </Fact>
          <Fact label="Arrival window">
            <span className="type-data text-ink">
              {trip.arrivalWindowStart && trip.arrivalWindowEnd
                ? `${formatTime(trip.arrivalWindowStart)}–${formatTime(trip.arrivalWindowEnd)}`
                : 'Any time on the day'}
            </span>
          </Fact>
        </dl>
      </div>
      <Perforation className="hidden lg:block" inset={12} />
      <div className="flex flex-col justify-center gap-1.5 bg-sunken px-6 py-5">
        <span className="type-body-s text-ink-2">{stub.label}</span>
        <span className="type-display-m text-ink">{stub.value}</span>
        <span className="type-caption text-ink-3">{stub.sub}</span>
      </div>
    </section>
  );
};
