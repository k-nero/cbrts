import { type FC, useState } from 'react';
import { Flex } from 'antd';

import { DelayAlertModal } from './DelayAlertModal';
import { JobClosingPanel } from './JobClosingPanel';
import { JobIncidents } from './JobIncidents';

import { Button } from '@/components/ui';
import type { JobDetail } from '@/interfaces';
import { RoleNameEnum, TripStatusEnum } from '@/interfaces';
import { useAuthStore } from '@/stores/authStore';

/** Moving and not yet arrived: a delay alert can still change what the crew and customers expect. */
const ON_THE_ROAD: string[] = [TripStatusEnum.DEPARTED, TripStatusEnum.HELD];

/**
 * The end of the Route tab: closing the job once it is handed over (US-F6-04), then the job's incidents with their
 * timelines (US-F5-05). The coordinator or the logistics manager sends a delay alert from here while the job is on the
 * road (US-F5-04). The journey log itself is the Trip progress page.
 */
export const OnTheRoad: FC<{ job: JobDetail }> = ({ job }) => {
  const [alerting, setAlerting] = useState(false);
  const roles = useAuthStore((state) => state.roles) as string[];
  const canAlert =
    ON_THE_ROAD.includes(job.tripStatus) &&
    (roles.includes(RoleNameEnum.FLEET_COORDINATOR) ||
      roles.includes(RoleNameEnum.LOGISTICS_MANAGER));
  const plannedArrival =
    job.routePlan?.stops.find((st) => st.kind === 'DELIVERY' && st.jobId === job.id)?.plannedAt ??
    null;
  return (
    <Flex vertical gap={24}>
      <JobClosingPanel job={job} />
      <JobIncidents
        jobId={job.id}
        action={
          canAlert && (
            <Button
              variant="secondary"
              size="sm"
              leadingIcon="clock"
              onClick={() => setAlerting(true)}
            >
              Send a delay alert
            </Button>
          )
        }
      />
      {canAlert && (
        <DelayAlertModal
          job={job}
          plannedArrival={plannedArrival}
          open={alerting}
          onClose={() => setAlerting(false)}
        />
      )}
    </Flex>
  );
};
