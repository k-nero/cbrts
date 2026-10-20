import { useState } from 'react';
import { Chip, Icon, Panel } from '@/components/ui';
import { useFleetCalendar, useVehicles } from '@/hooks/useVehicle';
import { type VehicleKind, VehicleKindEnum } from '@/interfaces';

export default function FleetCalendarPage() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('ALL');
  const [selectedKind, setSelectedKind] = useState<VehicleKind | 'ALL'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  let fromIso: string | undefined;
  let toIso: string | undefined;

  if (startDate && endDate) {
    fromIso = new Date(`${startDate}T00:00:00`).toISOString();
    toIso = new Date(`${endDate}T23:59:59.999`).toISOString();
  } else if (startDate) {
    const start = new Date(`${startDate}T00:00:00`);
    fromIso = start.toISOString();
    const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    end.setHours(23, 59, 59, 999);
    toIso = end.toISOString();
  } else if (endDate) {
    const end = new Date(`${endDate}T23:59:59.999`);
    toIso = end.toISOString();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    fromIso = start.toISOString();
  }
  const kindParam = selectedKind !== 'ALL' ? selectedKind : undefined;

  const { data: vehiclesData } = useVehicles();
  const { data: bookings, isLoading } = useFleetCalendar(fromIso, toIso, kindParam);

  const vehicles = vehiclesData?.content ?? [];
  const allBookings = bookings ?? [];

  const filteredBookings =
    selectedVehicleId === 'ALL'
      ? allBookings
      : allBookings.filter((b) => b.vehicleId === selectedVehicleId);

  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="type-display-m text-ink">Fleet Calendar</h1>
          <p className="type-body-m text-ink-2">
            Schedule of vehicle deployments, transport jobs, and planned maintenance windows.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="type-label-s text-ink-3">Type:</span>
            <select
              value={selectedKind}
              onChange={(e) => setSelectedKind(e.target.value as VehicleKind | 'ALL')}
              className="focus-ring h-9 rounded-md border border-line bg-card px-3 text-sm text-ink outline-none"
            >
              <option value="ALL">All types</option>
              {Object.values(VehicleKindEnum).map((k) => (
                <option key={k} value={k}>
                  {k === 'TRAILER' ? 'Trailer' : 'Rigid Truck'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="type-label-s text-ink-3">Vehicle:</span>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="focus-ring h-9 rounded-md border border-line bg-card px-3 text-sm text-ink outline-none"
            >
              <option value="ALL">All vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.code} ({v.kind.toLowerCase()})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="type-label-s text-ink-3">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="focus-ring h-9 rounded-md border border-line bg-card px-2 text-sm text-ink outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="type-label-s text-ink-3">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="focus-ring h-9 rounded-md border border-line bg-card px-2 text-sm text-ink outline-none"
            />
          </div>
        </div>
      </div>

      {/* Bookings / Schedule Timeline */}
      <Panel className="p-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <h3 className="type-h3 text-ink">Scheduled Deployments</h3>
            <span className="type-caption text-ink-3">
              {filteredBookings.length} scheduled slots
            </span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-ink-3">Loading calendar events...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line p-8 text-center text-ink-3">
              No vehicle bookings in this period.
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-line">
              {filteredBookings.map((b) => {
                const sDate = new Date(b.startsAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const eDate = new Date(b.endsAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                const kindTone =
                  b.kind === 'JOB' ? 'ok' : b.kind === 'MAINTENANCE' ? 'warn' : 'neutral';

                return (
                  <div
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-4 py-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="grid size-10 place-items-center rounded-lg bg-muted text-ink">
                        <Icon name="truck" size={20} />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="type-h4 text-ink">{b.vehicleCode}</span>
                          <Chip tone={kindTone}>{b.kind}</Chip>
                        </div>
                        {b.jobCode ? (
                          <span className="type-body-s text-ink-2">
                            Assigned to Job:{' '}
                            <span className="font-mono font-medium">{b.jobCode}</span>
                          </span>
                        ) : (
                          <span className="type-body-s text-ink-3">Internal fleet booking</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="type-data text-ink">
                        {sDate} → {eDate}
                      </span>
                      <span className="type-caption text-ink-3">Local Indochina Time</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
