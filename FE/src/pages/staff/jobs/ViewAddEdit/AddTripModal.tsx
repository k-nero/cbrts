import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type AddTripForm, addTripSchema } from './flightSchema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { Callout } from '@/components/ui';
import { useAddTrip, useJourneyCorridors } from '@/hooks/useJob';
import type { JobDetail, JourneyCorridor, TripPart } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

/** "Flight · Ho Chi Minh City → Hong Kong · AIR SGN → HKG · quoted". */
const label = (c: JourneyCorridor) =>
  [
    c.mode === 'AIR' ? 'Flight' : 'Road',
    `${c.fromCity} → ${c.toCity}`,
    c.corridorCode,
    c.quoted ? 'quoted' : null,
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * Add the next trip of the job's journey (US-F3-21): a catalog corridor touching the city the
 * journey has reached, driven or flown from there. The quoted route's corridors come first. To
 * share a trip already planned, add the trip, then join a confirmed trip from its Load plan.
 */
export const AddTripModal: FC<{
  job: JobDetail;
  open: boolean;
  onClose: () => void;
  onAdded: (part: TripPart) => void;
}> = ({ job, open, onClose, onAdded }) => {
  const { message } = App.useApp();
  const corridors = useJourneyCorridors(job.id, open);
  const add = useAddTrip(job.id);
  const methods = useFormCustom<AddTripForm>({
    resolver: zodResolver(addTripSchema),
    values: { corridor: undefined as unknown as AddTripForm['corridor'] },
  });
  const options = (corridors.data ?? []).map((c) => ({ value: c.corridorId, label: label(c) }));
  const first = job.parts.length === 0;

  const close = () => {
    add.reset();
    methods.reset();
    onClose();
  };

  const onSubmit = methods.handleSubmit((v) => {
    add.mutate(v.corridor.value, {
      onSuccess: (parts) => {
        const added = parts.at(-1);
        message.success(`${added?.tripCode ?? 'The trip'} added to ${job.code}’s journey.`);
        if (added) onAdded(added);
        close();
      },
      onError: (error) =>
        methods.setError('form_error', {
          message: apiErrorMessage(error, 'The trip wasn’t added. Try again.'),
        }),
    });
  });

  return (
    <BaseModal open={open} onCancel={close} title={`Add a trip from ${job.journeyEndCity ?? ''}`}>
      <FormWrapper
        methods={methods}
        isSubmitting={add.isPending}
        mode="add"
        onCancel={close}
        onFinish={onSubmit}
        layout="vertical"
      >
        {({ FormField }) => (
          <Flex vertical gap={16}>
            <p className="type-body-m m-0 text-ink-2">
              {first
                ? `The first trip collects the horses at ${job.originPlace?.name ?? job.originCity}.`
                : `The trip collects the horses where the last trip hands them on in ${job.journeyEndCity}.`}{' '}
              A trip that ends short of {job.destinationCity} hands them on there for the next one.
            </p>
            <FormField
              name="corridor"
              label="Corridor"
              component="select"
              componentProps={{
                isRequired: true,
                options,
                isLoading: corridors.isPending,
                placeholder: 'Choose where the trip goes',
                instruction: 'Driven or flown from the city the journey has reached.',
              }}
            />
            {corridors.data && corridors.data.length === 0 && (
              <Callout tone="warn" title={`No corridor runs from ${job.journeyEndCity}`}>
                Add one on the Routes page first.
              </Callout>
            )}
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton type="primary" label="Add trip" />
            </Flex>
          </Flex>
        )}
      </FormWrapper>
    </BaseModal>
  );
};
