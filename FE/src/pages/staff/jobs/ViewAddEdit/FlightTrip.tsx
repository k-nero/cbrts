import { type FC, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';
import dayjs from 'dayjs';

import { FlightPanel } from './FlightPanel';
import { type FlightForm, flightSchema } from './flightSchema';
import { LoadPlanTab } from './LoadPlanTab';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { Button, Callout, Panel } from '@/components/ui';
import { useCanPlanTrips, useSetFlight } from '@/hooks/useJob';
import type { FlightInfo, JobDetail, TripPart } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

const LOCAL_DATETIME = 'YYYY-MM-DDTHH:mm';
const SHOWN_DATETIME = 'D MMM YYYY, HH:mm';

/**
 * A flight of the journey (US-F3-21): no load plan and no route to edit. Its route runs from one
 * cargo terminal to the other, confirmed when the trip was added; the coordinator sets the
 * airline's flight here, and its times become the times of the airport stops, checked against the
 * trips before and after. Below it, each job's consignment and the flight crew and sign-off.
 */
export const FlightTrip: FC<{ job: JobDetail; part: TripPart }> = ({ job, part }) => {
  const [open, setOpen] = useState(false);
  const planning = useCanPlanTrips() && part.status === 'NOT_STARTED';
  const flight = (job.routePlan?.legs ?? []).find((leg) => leg.mode === 'AIR')?.flight ?? null;

  return (
    <Flex vertical gap={24}>
      {!flight && (
        <Callout tone="warn" title="The flight isn’t set yet">
          Enter the airline’s flight and its times: they set this trip’s dates, and the trip can’t
          be signed off without them.
        </Callout>
      )}
      <Panel
        title={flight ? `Schedule · ${flight.airline} ${flight.flightNo}` : 'Schedule'}
        extra={
          planning && (
            <Button
              size="sm"
              variant={flight ? 'secondary' : 'primary'}
              onClick={() => setOpen(true)}
            >
              {flight ? 'Change flight' : 'Set flight'}
            </Button>
          )
        }
      >
        <p className="type-body-m m-0 text-ink-2">
          {part.startCity} → {part.endCity}
          {flight?.scheduledDepartureAt
            ? ` · departs ${dayjs(flight.scheduledDepartureAt).format(SHOWN_DATETIME)}`
            : ''}
          {flight?.scheduledArrivalAt
            ? ` · lands ${dayjs(flight.scheduledArrivalAt).format(SHOWN_DATETIME)}`
            : ''}
        </p>
      </Panel>
      <FlightPanel job={job} />
      <LoadPlanTab job={job} />
      <FlightModal
        job={job}
        part={part}
        flight={flight}
        open={open}
        onClose={() => setOpen(false)}
      />
    </Flex>
  );
};

const FlightModal: FC<{
  job: JobDetail;
  part: TripPart;
  flight: FlightInfo | null;
  open: boolean;
  onClose: () => void;
}> = ({ job, part, flight, open, onClose }) => {
  const { message } = App.useApp();
  const save = useSetFlight(job.id);
  const local = (iso?: string | null) => (iso ? dayjs(iso).format(LOCAL_DATETIME) : '');
  const methods = useFormCustom<FlightForm>({
    resolver: zodResolver(flightSchema),
    values: {
      airline: flight?.airline ?? '',
      flightNo: flight?.flightNo ?? '',
      aircraftType: flight?.aircraftType ?? '',
      stallCapacity: flight?.stallCapacity ?? null,
      departs: local(flight?.scheduledDepartureAt),
      arrives: local(flight?.scheduledArrivalAt),
    },
  });

  const onSubmit = methods.handleSubmit((v) => {
    save.mutate(
      {
        trip: part.tripId,
        flight: {
          airline: v.airline.trim(),
          flightNo: v.flightNo.trim(),
          aircraftType: v.aircraftType.trim() || null,
          stallCapacity: v.stallCapacity,
          scheduledDepartureAt: dayjs(v.departs).toISOString(),
          scheduledArrivalAt: dayjs(v.arrives).toISOString(),
        },
      },
      {
        onSuccess: () => {
          message.success(`Flight ${v.flightNo.trim()} set for ${part.tripCode}.`);
          onClose();
        },
        onError: (error) =>
          methods.setError('form_error', {
            message: apiErrorMessage(error, 'The flight wasn’t saved. Try again.'),
          }),
      },
    );
  });

  return (
    <BaseModal open={open} onCancel={onClose} title={`${part.tripCode} · Flight`}>
      <FormWrapper
        methods={methods}
        isSubmitting={save.isPending}
        mode={flight ? 'edit' : 'add'}
        onCancel={onClose}
        onFinish={onSubmit}
        layout="vertical"
      >
        {({ FormField }) => (
          <>
            <Flex gap={16}>
              <FormField
                name="airline"
                label="Airline"
                component="text"
                componentProps={{ isRequired: true }}
              />
              <FormField
                name="flightNo"
                label="Flight number"
                component="text"
                componentProps={{ isRequired: true }}
              />
            </Flex>
            <Flex gap={16}>
              <FormField name="aircraftType" label="Aircraft" component="text" />
              <FormField
                name="stallCapacity"
                label="Stall positions for this trip"
                component="number"
                componentProps={{ min: 1, step: 1 }}
              />
            </Flex>
            <Flex gap={16}>
              <FormField
                name="departs"
                label={`Takes off from ${part.startCity}`}
                component="datepicker"
                componentProps={{
                  isRequired: true,
                  showTime: { format: 'HH:mm' },
                  format: SHOWN_DATETIME,
                  valueFormat: LOCAL_DATETIME,
                }}
              />
              <FormField
                name="arrives"
                label={`Lands in ${part.endCity}`}
                component="datepicker"
                componentProps={{
                  isRequired: true,
                  showTime: { format: 'HH:mm' },
                  format: SHOWN_DATETIME,
                  valueFormat: LOCAL_DATETIME,
                }}
              />
            </Flex>
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton type="primary" label="Save flight" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};
