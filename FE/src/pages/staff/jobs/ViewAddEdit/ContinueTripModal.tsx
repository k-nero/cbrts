import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type ContinueTripForm, continueTripSchema } from './flightSchema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { Callout } from '@/components/ui';
import { useContinueOnTrip, useCorridors } from '@/hooks/useJob';
import type { JobDetail, RouteStop } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

/**
 * Continue the job's journey on another trip from an airport or quarantine stop (US-F3-16): the
 * stop becomes this trip's transfer, and the stops after it move to a new trip on the chosen
 * corridor, with its own carrier, dates and crew. The quotation doesn't change.
 */
export const ContinueTripModal: FC<{
  job: JobDetail;
  stop: RouteStop | null;
  onClose: () => void;
}> = ({ job, stop, onClose }) => {
  const { message } = App.useApp();
  const corridors = useCorridors(stop !== null);
  const continueOn = useContinueOnTrip(job.id);
  const methods = useFormCustom<ContinueTripForm>({
    resolver: zodResolver(continueTripSchema),
    values: { corridor: undefined as unknown as ContinueTripForm['corridor'] },
  });
  // The plane leaves from here: the next trip flies. Elsewhere it drives on.
  const flies = stop?.kind === 'AIRPORT_OUT';
  const options = (corridors.data ?? [])
    .filter((c) => (flies ? c.mode === 'AIR' : c.mode === 'ROAD'))
    .map((c) => ({ value: c.id, label: `${c.code} · ${c.originCity} → ${c.destinationCity}` }));

  const close = () => {
    continueOn.reset();
    methods.reset();
    onClose();
  };

  const onSubmit = methods.handleSubmit((v) => {
    if (!stop) return;
    continueOn.mutate(
      { stopSeq: stop.seq, corridorId: v.corridor.value },
      {
        onSuccess: () => {
          message.success(
            `${job.code} continues from ${stop.placeName ?? 'this stop'} on a new trip.`,
          );
          close();
        },
      },
    );
  });

  return (
    <BaseModal
      open={stop !== null}
      onCancel={close}
      title={`Continue from ${stop?.placeName ?? 'this stop'} on another trip`}
    >
      <FormWrapper
        methods={methods}
        isSubmitting={continueOn.isPending}
        mode="edit"
        onCancel={close}
        onFinish={onSubmit}
        layout="vertical"
        force
      >
        {({ FormField }) => (
          <>
            <p className="type-body-m m-0 text-ink-2">
              The horses wait here between carriers. This trip ends here, and the stops after it
              move to a new trip {flies ? 'that flies' : 'by road'}, planned, crewed and signed off
              on its own. The quotation and invoices don’t change.
            </p>
            <FormField
              name="corridor"
              label={flies ? 'Air corridor of the next trip' : 'Road corridor of the next trip'}
              component="select"
              componentProps={{
                options,
                isRequired: true,
                isLoading: corridors.isLoading,
                placeholder: 'Choose a corridor',
              }}
            />
            {continueOn.isError && (
              <Callout tone="bad" title="Not split">
                {apiErrorMessage(continueOn.error, 'Something went wrong. Try again.')}
              </Callout>
            )}
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton label="Continue on a new trip" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};
