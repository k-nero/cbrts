import { useEffect, useState } from 'react';

import { formatClock } from '../tripFormat';

import { Chip, Icon, StageMark } from '@/components/ui';
import type { TripView } from '@/interfaces';
import { TripStatusEnum } from '@/interfaces';

type Props = {
  trip: TripView;
  userName?: string;
  userRole?: string;
  synced?: boolean;
};

export function CabBar({
  trip,
  userName = 'Minh, driver',
  userRole = 'Driver',
  synced = true,
}: Props) {
  const [clock, setClock] = useState(() => formatClock(new Date()));

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(formatClock(new Date()));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isHeld = trip.tripStatus === TripStatusEnum.HELD;
  const isDelivered = trip.tripStatus === TripStatusEnum.DELIVERED;
  const pillTone = isHeld ? 'bad' : 'ok';
  const pillLabel = isHeld
    ? 'Held at the border'
    : isDelivered
      ? `Arrived ${formatClock(trip.plannedArrivalAt)}`
      : 'Clear to depart';

  const initials = userName
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-card px-8 py-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="type-mono-data text-ink-2">{trip.jobCode}</span>
        <h2 className="type-h4 m-0 text-ink">
          {trip.origin ?? 'Origin'} → {trip.destination ?? 'Destination'}
        </h2>
        <StageMark stage="Trip" />
        <Chip tone={pillTone}>{pillLabel}</Chip>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Icon
            name={synced ? 'check' : 'clock'}
            size={18}
            className={synced ? 'text-ok' : 'text-warn'}
          />
          <span className={`type-label-s ${synced ? 'text-ink-2' : 'text-warn'}`}>
            {synced ? 'All records sent' : '1 record waiting to send'}
          </span>
        </div>

        <span className="type-mono-data text-2xl font-bold tracking-tight text-ink">{clock}</span>

        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-full bg-muted text-ink-2">
            <span className="type-label-s">{initials || 'EC'}</span>
          </div>
          <div className="flex flex-col">
            <span className="type-label-s text-ink">{userName}</span>
            <span className="type-body-s text-ink-3">{userRole}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
