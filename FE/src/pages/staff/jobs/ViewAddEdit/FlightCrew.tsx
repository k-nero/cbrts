import { type FC, useState } from 'react';
import { Flex } from 'antd';

import { AssignFlightCrewModal } from './AssignFlightCrewModal';

import { Button } from '@/components/ui';
import { useCanPlanTrips } from '@/hooks/useJob';
import type { JobDetail } from '@/interfaces';

/**
 * The trip's flight crew (US-F3-15): who flies with the horses, and for the coordinator or the manager, the button
 * that assigns them until the trip leaves.
 */
export const FlightCrew: FC<{ job: JobDetail }> = ({ job }) => {
  const [assigning, setAssigning] = useState(false);
  const canAssign = useCanPlanTrips() && job.tripStatus === 'NOT_STARTED';
  const flightCrew = job.crew.filter((c) => c.onFlight);

  return (
    <Flex vertical gap={4} align="start">
      <span className="type-body-s text-ink-3">
        Flight crew:{' '}
        {flightCrew.length > 0
          ? flightCrew
              .map((c) => `${c.name} (${c.crewRole.toLowerCase().replace('_', ' ')})`)
              .join(', ')
          : 'none assigned yet'}
      </span>
      {canAssign && (
        <Button variant="secondary" size="sm" onClick={() => setAssigning(true)}>
          {flightCrew.length > 0 ? 'Change flight crew' : 'Assign flight crew'}
        </Button>
      )}
      {assigning && (
        <AssignFlightCrewModal job={job} open={assigning} onClose={() => setAssigning(false)} />
      )}
    </Flex>
  );
};
