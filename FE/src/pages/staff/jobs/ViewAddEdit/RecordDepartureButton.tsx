import { type FC, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';

import { Button } from '@/components/ui';
import { useTripRecord } from '@/hooks/trip';
import { useCanPlanTrips } from '@/hooks/useJob';
import { type JobDetail, type TripPart, TripRecordKindEnum } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

type Props = {
  job: JobDetail;
  /** The trip of the journey this tab shows; the job's current trip when null. */
  part: TripPart | null;
};

/**
 * Records the trip's departure from the office (US-F3-11): the same Departed record the trip progress page saves,
 * Flight departed for a flight. The server holds it back until the gate is clear and the plan is signed off, and
 * says why; departing moves every job on the trip and freezes their documents, so it is confirmed first.
 */
export const RecordDepartureButton: FC<Props> = ({ job, part }) => {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const canRecord = useCanPlanTrips();
  const record = useTripRecord('staff', job.code, part?.tripId);
  // Kept across a retry so a request that reached the server isn't saved twice.
  const clientRef = useRef<string | null>(null);
  const flight = part?.mode === 'AIR';
  const tripName = part?.tripCode ?? 'the trip';

  if (!canRecord) {
    return (
      <span className="type-body-s text-ink-3">
        The fleet coordinator or the escort records the departure.
      </span>
    );
  }

  const depart = async () => {
    clientRef.current ??= crypto.randomUUID();
    try {
      await record.mutateAsync({
        routeStopId: null,
        kind: flight ? TripRecordKindEnum.FLIGHT_DEPARTED : TripRecordKindEnum.DEPARTED,
        occurredAt: new Date().toISOString(),
        clientRef: clientRef.current,
      });
      clientRef.current = null;
      await queryClient.invalidateQueries({ queryKey: ['job', job.id] });
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
      message.success(
        `${tripName} departed. The documents are frozen and the customer can follow it.`,
      );
    } catch (error) {
      message.error(apiErrorMessage(error, 'The departure wasn’t recorded. Try again.'));
    }
  };

  return (
    <Button
      variant="primary"
      size="md"
      leadingIcon="arrow-right"
      disabled={record.isPending}
      onClick={() =>
        modal.confirm({
          title: `Record ${tripName}'s departure now?`,
          content: `It ${flight ? 'records the flight as departed' : 'records the trip as on the road'} at the current time, for every job on it. The jobs' documents are then frozen. This can't be undone.`,
          okText: 'Record departure',
          cancelText: 'Not yet',
          onOk: depart,
        })
      }
    >
      {record.isPending ? 'Recording...' : 'Record departure'}
    </Button>
  );
};
