import { useState } from 'react';
import { Flex } from 'antd';

import { ConsignmentModal } from './ConsignmentModal';

import { Button, Chip, Panel } from '@/components/ui';
import type { FlightAllocation, FlightInfo, JobDetail } from '@/interfaces';
import { SERVICE_CLASS_LABELS } from '@/lib/utils/request';

const when = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'not set';

/**
 * The trip's flight on the Route tab (US-F3-15): what every job shares, how many of the stall positions the airline
 * gives the trip are taken, and each job's own consignment (air waybill, positions, class) to fill in.
 */
export function FlightPanel({ job }: { job: JobDetail }) {
  const [editing, setEditing] = useState<{
    flight: FlightInfo;
    allocation: FlightAllocation;
  } | null>(null);
  const flights = (job.routePlan?.legs ?? [])
    .filter((leg) => leg.mode === 'AIR' && leg.flight)
    .map((leg) => leg.flight as FlightInfo);
  if (flights.length === 0) return null;

  return (
    <>
      {flights.map((flight) => {
        const taken = flight.allocations.reduce((sum, a) => sum + (a.stallPositions ?? 0), 0);
        const full = flight.stallCapacity != null && taken > flight.stallCapacity;
        return (
          <Panel
            key={flight.id ?? flight.flightNo}
            title={`Flight ${flight.flightNo} · ${flight.airline}`}
            extra={
              <Chip tone={full ? 'bad' : 'neutral'}>
                {flight.stallCapacity != null
                  ? `${taken} of ${flight.stallCapacity} stall positions`
                  : `${taken} stall positions · capacity not set`}
              </Chip>
            }
          >
            <Flex vertical gap={12}>
              <p className="type-body-s m-0 text-ink-3">
                {[
                  flight.aircraftType,
                  `Departs ${when(flight.scheduledDepartureAt)}`,
                  `Arrives ${when(flight.scheduledArrivalAt)}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <Flex component="ul" vertical className="m-0 list-none divide-y divide-line p-0">
                {flight.allocations.map((a) => (
                  <li key={a.id} className="py-3">
                    <Flex wrap align="center" justify="space-between" gap={12}>
                      <Flex vertical gap={2}>
                        <span className="type-label-m text-ink">
                          {a.jobCode}
                          {a.jobId === job.id && (
                            <span className="type-body-s text-ink-3"> · this job</span>
                          )}
                        </span>
                        <span className="type-body-s text-ink-2">
                          {[
                            a.airWaybill ? `AWB ${a.airWaybill}` : 'Air waybill not set',
                            `${a.stallPositions ?? '?'} ${a.stallPositions === 1 ? 'position' : 'positions'}`,
                            a.serviceClass ? SERVICE_CLASS_LABELS[a.serviceClass] : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </Flex>
                      <Button size="sm" onClick={() => setEditing({ flight, allocation: a })}>
                        Edit consignment
                      </Button>
                    </Flex>
                  </li>
                ))}
              </Flex>
              {flight.allocations.length > 1 && (
                <p className="type-body-s m-0 text-ink-3">
                  Each job keeps its own waybill, stall positions, airport customs and documents.
                </p>
              )}
            </Flex>
          </Panel>
        );
      })}
      {editing && (
        <ConsignmentModal
          flight={editing.flight}
          allocation={editing.allocation}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
