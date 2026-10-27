import type { FC } from 'react';
import { Flex } from 'antd';

import { ArrivalCondition } from './ArrivalCondition';
import { ConditionLog } from './ConditionLog';
import { RouteRecord } from './RouteRecord';
import { TrackingLead } from './TrackingLead';
import { TrackingPass } from './TrackingPass';
import { TripHistory } from './TripHistory';
import { TripStages } from './TripStages';
import { delivered, routeStops, stageRows } from './tracking';
import { OnTheRoad } from '../../home/OnTheRoad';

import { Button } from '@/components/ui';
import type { Horse, TransportRequest, TripView } from '@/interfaces';

type Props = {
  request: TransportRequest;
  trip: TripView;
  horses: Horse[];
  onBack: () => void;
};

/**
 * The request once its horses are on the road (DESIGN.md, the tracking page model; Figma "Tracking · In
 * transit" and "Tracking · Delivered"). A journey of several trips reads as one route: the transfers where one
 * trip hands the horses to the next are stops on it.
 */
export const RequestTracking: FC<Props> = ({ request, trip, horses, onBack }) => {
  const now = new Date().toISOString();
  const lastAt = trip.records.at(-1)?.occurredAt ?? now;
  const done = delivered(trip);
  return (
    <Flex vertical gap={24}>
      {/* The pass is the header (DESIGN.md, The pass header): only the back link sits above it. */}
      <div>
        <Button variant="ghost" size="sm" leadingIcon="arrow-left" onClick={onBack}>
          My requests
        </Button>
      </div>
      <h1 className="sr-only">
        {request.code} · {done ? 'Delivered' : 'In transit'}
      </h1>
      <TrackingPass request={request} trip={trip} horses={horses} now={now} />
      <TrackingLead trip={trip} now={now} />
      {done ? (
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_456px]">
          <Flex vertical gap={24}>
            <ArrivalCondition trip={trip} />
            <TripStages rows={stageRows(trip, now)} />
          </Flex>
          <RouteRecord trip={trip} />
        </div>
      ) : (
        <>
          <OnTheRoad
            trip={{
              updatedAt: lastAt,
              gate: trip.clearanceReady ? 'clear' : 'locked',
              stops: routeStops(trip).map((s) => ({
                name: String(s.name),
                kind: String(s.kind),
                state: s.state,
                time: String(s.time),
              })),
            }}
          />
          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_456px]">
            <TripStages rows={stageRows(trip, now)} />
            <ConditionLog trip={trip} />
          </div>
        </>
      )}
      <TripHistory trip={trip} request={request} />
    </Flex>
  );
};
