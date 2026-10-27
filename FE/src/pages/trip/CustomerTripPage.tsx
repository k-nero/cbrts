import { Navigate, useSearchParams } from 'react-router-dom';
import { Spin } from 'antd';

import { useTrips } from '@/hooks/trip';
import { useCustomRouter } from '@/router/route.hook';

/**
 * A move is tracked on its request page (Tracking · In transit, Delivered), so there is no tracking tab. This route
 * stays for the links notifications already carry (/tracking?job=CBRT-…): it opens that job's request, and
 * anything else opens My requests.
 */
export function CustomerTripPage() {
  const router = useCustomRouter();
  const [params] = useSearchParams();
  const job = params.get('job');
  const query = useTrips('customer', 0);
  const requestId = job
    ? query.data?.content.find((r) => r.jobCodes.includes(job))?.requestId
    : undefined;

  if (job && query.isPending)
    return (
      <div className="py-12 text-center">
        <Spin />
      </div>
    );
  return (
    <Navigate
      replace
      to={
        requestId
          ? router.paths.get('request', { pathParams: [requestId] })
          : router.paths.get('my-requests')
      }
    />
  );
}
