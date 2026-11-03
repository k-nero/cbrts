import { type FC, useState } from 'react';

import { tripHistory } from './tracking';
import { TripPhotos } from './TripPhotos';

import { HistoryPanel } from '@/components/request/HistoryPanel';
import { Button } from '@/components/ui';
import type { TransportRequest, TripView } from '@/interfaces';

/** The move's history, newest first: the last three events, then all of them on request. */
export const TripHistory: FC<{ trip: TripView; request: TransportRequest }> = ({
  trip,
  request,
}) => {
  const [all, setAll] = useState(false);
  const history = tripHistory(trip, request);
  if (history.length === 0) return null;
  return (
    <HistoryPanel
      history={(all ? history : history.slice(0, 3)).map((e) => ({
        ...e,
        media: <TripPhotos photos={e.photos} />,
      }))}
      footer={
        history.length > 3 && (
          <Button size="sm" variant="ghost" onClick={() => setAll(!all)}>
            {all ? 'Show the latest 3' : `Show all ${history.length} events`}
          </Button>
        )
      }
    />
  );
};
