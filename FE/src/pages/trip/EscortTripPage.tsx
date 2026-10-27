import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Flex, Spin } from 'antd';

import { CabSurface } from './cab/CabSurface';
import { tripKey } from './cab/CabBar';

import { Callout, Panel } from '@/components/ui';
import { useTrip, useTrips } from '@/hooks/trip';
import { apiErrorMessage } from '@/lib/utils';

/**
 * The escort's Trip log: the cab surface for the trip they ride (DESIGN.md, Escort cab surface). It
 * follows the theme the escort picked: Light for a sunlit cab, Dark for night driving.
 */
export function EscortTripPage() {
  // An escort has a handful of trips; the first page holds them (TripService.escortTrips).
  const tripsQuery = useTrips('escort', 0);
  const trips = tripsQuery.data?.content ?? [];
  // A notification opens the trip of its job (/escort?job=CBRT-…).
  const [searchParams] = useSearchParams();
  const [picked, setPicked] = useState(searchParams.get('job') ?? '');
  const row =
    trips.find((t) => tripKey(t) === picked) ??
    trips.find((t) => t.jobCodes.includes(picked)) ??
    trips[0];
  // Hold on to the trip shown: saving a record re-sorts the list, and the page must not jump.
  const rowKey = row && tripKey(row);
  useEffect(() => {
    if (rowKey && rowKey !== picked) setPicked(rowKey);
  }, [rowKey, picked]);
  const tripQuery = useTrip('escort', row?.jobCode ?? '', row?.tripCode ?? undefined);
  const trip = tripQuery.data;

  return (
    <>
      <h1 className="sr-only">Trip log</h1>
      <Flex vertical gap={20}>
        {(tripsQuery.isPending || (row && tripQuery.isPending)) && (
          <div className="py-12 text-center">
            <Spin />
          </div>
        )}
        {tripsQuery.isError && (
          <Callout tone="bad" title="Your trips could not be loaded">
            {apiErrorMessage(tripsQuery.error, 'Refresh the page to try again.')}
          </Callout>
        )}
        {tripQuery.isError && (
          <Callout tone="bad" title="This trip could not be loaded">
            {apiErrorMessage(tripQuery.error, 'Refresh the page to try again.')}
          </Callout>
        )}
        {tripsQuery.data && trips.length === 0 && (
          <Panel title="No trip assigned yet">
            <p className="type-body-s m-0 text-ink-2">
              Your trips appear here once the fleet coordinator puts you on a trailer.
            </p>
          </Panel>
        )}
        {row && trip && (
          <CabSurface
            key={tripKey(row)}
            trip={trip}
            trips={trips}
            selected={tripKey(row)}
            onSelect={setPicked}
          />
        )}
      </Flex>
    </>
  );
}
