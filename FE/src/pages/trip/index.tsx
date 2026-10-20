import { useState } from 'react';
import { Select, Spin } from 'antd';
import PageHeader from '@/components/PageHeader';
import { Callout } from '@/components/ui';
import { useTrips } from '@/hooks/trip';
import { apiErrorMessage } from '@/lib/utils';
import { CoordinatorTripView } from './CoordinatorTripView';
import { CustomerTripView } from './CustomerTripView';
import { EscortCabSurface } from './EscortCabSurface';

export { CoordinatorTripView } from './CoordinatorTripView';
export { CustomerTripView } from './CustomerTripView';
export { EscortCabSurface } from './EscortCabSurface';

/**
 * Escort Cab Surface (Figma: "Trip: the escort's cab surface (Flow 4, on the road)").
 * Rendered on a sunlit tablet in the cab, always in Light mode, with 48px touch controls,
 * times at 28px, and the primary forward action docked at the bottom edge.
 */
export function EscortTripPage() {
  return <EscortCabSurface />;
}

/**
 * Customer Trip Tracking (Figma: "Tracking · In transit" & "Tracking · Delivered").
 * Shows live route progress, where it stands, latest condition log, and handover confirmation.
 */
export function CustomerTripPage() {
  return <CustomerTripView />;
}

/**
 * Fleet & Route Coordinator Trip Progress (Figma: "Fleet & route coordinator · Trip").
 * The office side of Flow 4: 4 stat tiles, full-width checkpoints table with planned vs recorded,
 * escort journal log, on-board horses, vehicle & crew details, and incident escalation.
 */
export function StaffTripPage() {
  const [page, setPage] = useState(0);
  const { data, isPending, isError, error } = useTrips('staff', page);
  const trips = data?.content ?? [];
  const [selectedCode, setSelectedCode] = useState('');

  const currentCode = trips.some((t) => t.jobCode === selectedCode)
    ? selectedCode
    : (trips[0]?.jobCode ?? '');

  return (
    <div className="flex flex-col gap-6 p-8">
      <PageHeader
        title="Trip progress"
        summary="Track active journeys against route plans and record office checkpoints."
        right={
          trips.length > 1 ? (
            <Select
              value={currentCode}
              onChange={setSelectedCode}
              className="min-w-64"
              options={trips.map((t) => ({
                value: t.jobCode,
                label: `${t.jobCode} · ${t.origin || 'Origin'} → ${t.destination || 'Destination'}`,
              }))}
            />
          ) : undefined
        }
      />

      {isPending && (
        <div className="flex h-64 items-center justify-center">
          <Spin size="large" />
        </div>
      )}

      {isError && (
        <Callout tone="bad" title="Could not load active trips">
          {apiErrorMessage(error, 'Failed to fetch trips for coordinator.')}
        </Callout>
      )}

      {trips.length === 0 && !isPending && (
        <Callout tone="neutral" title="No active trips in transit">
          There are no trips currently departed or in transit. Trips will appear here once departure is recorded.
        </Callout>
      )}

      {currentCode && <CoordinatorTripView jobCode={currentCode} />}
    </div>
  );
}
