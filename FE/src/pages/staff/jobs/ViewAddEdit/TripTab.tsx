import { Skeleton } from 'antd';

import { TripDetails } from '@/pages/trip/TripDetails';
import { Callout } from '@/components/ui';
import { useTrip } from '@/hooks/trip';
import { apiErrorMessage } from '@/lib/utils';

/** The Trip tab inside a job's detail page: live progress read by the coordinator or manager. */
export function TripTab({ jobCode }: { jobCode: string }) {
  const { data: trip, isPending, isError, error } = useTrip('staff', jobCode);

  if (isPending) {
    return <Skeleton active paragraph={{ rows: 6 }} />;
  }

  if (isError || !trip) {
    return (
      <Callout tone="bad" title="Trip progress could not be loaded">
        {apiErrorMessage(error, 'Refresh the page to try again.')}
      </Callout>
    );
  }

  return <TripDetails trip={trip} />;
}
