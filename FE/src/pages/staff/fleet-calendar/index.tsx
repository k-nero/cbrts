import { Flex } from 'antd';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Chip, Icon, Panel } from '@/components/ui';
import { useFleetCalendar, useVehicles } from '@/hooks/useVehicle';
import { type VehicleKind, VehicleKindEnum } from '@/interfaces';

export default function FleetCalendarPage() {
  const navigate = useNavigate();
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
    <div className="p-8">
      <Flex vertical gap={32}>
        {/* Header */}
        <Flex wrap gap={16} align="center" justify="space-between">
          <Flex vertical gap={4}>
            <h1 className="type-display-m text-ink">Fleet Calendar</h1>
            <p className="type-body-m text-ink-2">
              Schedule of vehicle deployments, transport jobs, and planned maintenance windows.
            </p>
          </Flex>

          {/* Filters */}
          <Flex wrap gap={12} align="center">
            <Flex gap={8} align="center">
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
            </Flex>

            <Flex gap={8} align="center">
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
            </Flex>

            <Flex gap={8} align="center">
              <span className="type-label-s text-ink-3">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="focus-ring h-9 rounded-md border border-line bg-card px-2 text-sm text-ink outline-none"
              />
            </Flex>

            <Flex gap={8} align="center">
              <span className="type-label-s text-ink-3">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="focus-ring h-9 rounded-md border border-line bg-card px-2 text-sm text-ink outline-none"
              />
            </Flex>
          </Flex>
        </Flex>

        {/* Bookings / Schedule Timeline */}
        <Panel className="p-6">
          <Flex vertical gap={24}>
            <div className="pb-4 border-b border-line">
              <Flex align="center" justify="space-between">
                <h3 className="type-h3 text-ink">Scheduled Deployments</h3>
                <span className="type-caption text-ink-3">
                  {filteredBookings.length} scheduled slots
                </span>
              </Flex>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-ink-3">Loading calendar events...</div>
            ) : filteredBookings.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line p-8 text-center text-ink-3">
                No vehicle bookings in this period.
              </div>
            ) : (
              <Flex vertical className="divide-y divide-line">
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

                  // A RESERVED booking is a vehicle held for an accepted request (US-F7-02).
                  const kindTone =
                    b.kind === 'JOB'
                      ? 'ok'
                      : b.kind === 'MAINTENANCE'
                        ? 'warn'
                        : b.kind === 'RESERVED'
                          ? 'info'
                          : 'neutral';

                  // A trip's booking opens the job's Trip tab on that trip; a shared trip, its first job.
                  const jobIds = b.jobIds ?? (b.jobId ? [b.jobId] : []);
                  const jobCodes = b.jobCode?.split(', ') ?? [];
                  const tripHref = (jobId: string) =>
                    `/staff/jobs/${jobId}?tab=trip${b.tripId ? `&trip=${b.tripId}` : ''}`;
                  const opens = jobIds.length > 0 ? tripHref(jobIds[0]) : null;

                  return (
                    <div
                      key={b.id}
                      className={
                        opens ? '-mx-3 cursor-pointer rounded-lg px-3 py-4 hover:bg-muted' : 'py-4'
                      }
                      onClick={opens ? () => void navigate(opens) : undefined}
                    >
                      <Flex wrap gap={16} align="center" justify="space-between">
                        <Flex gap={16} align="center">
                          <Flex
                            align="center"
                            justify="center"
                            className="size-10 rounded-lg bg-muted text-ink"
                          >
                            <Icon name="truck" size={20} />
                          </Flex>
                          <Flex vertical>
                            <Flex gap={8} align="center">
                              <span className="type-h4 text-ink">{b.vehicleCode}</span>
                              <Chip tone={kindTone}>{b.kind === 'RESERVED' ? 'Held' : b.kind}</Chip>
                            </Flex>
                            {b.jobCode ? (
                              <span className="type-body-s text-ink-2">
                                {b.tripCode && (
                                  <>
                                    Trip <span className="font-mono font-medium">{b.tripCode}</span>
                                    {' · '}
                                  </>
                                )}
                                {jobCodes.length > 1 ? 'Jobs ' : 'Job '}
                                {jobCodes.map((code, i) => (
                                  <span key={code}>
                                    {i > 0 && ', '}
                                    {jobIds[i] ? (
                                      <Link
                                        to={tripHref(jobIds[i])}
                                        className="font-mono font-medium text-ink! underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {code}
                                      </Link>
                                    ) : (
                                      <span className="font-mono font-medium">{code}</span>
                                    )}
                                  </span>
                                ))}
                              </span>
                            ) : b.requestCode ? (
                              <span className="type-body-s text-ink-2">
                                Held for request{' '}
                                <span className="font-mono font-medium">{b.requestCode}</span> until
                                its trip&apos;s load plan is confirmed
                              </span>
                            ) : (
                              <span className="type-body-s text-ink-3">Internal fleet booking</span>
                            )}
                          </Flex>
                        </Flex>

                        <Flex vertical align="end">
                          <span className="type-data text-ink">
                            {sDate} → {eDate}
                          </span>
                          <span className="type-caption text-ink-3">Local Indochina Time</span>
                        </Flex>
                      </Flex>
                    </div>
                  );
                })}
              </Flex>
            )}
          </Flex>
        </Panel>
      </Flex>
    </div>
  );
}
