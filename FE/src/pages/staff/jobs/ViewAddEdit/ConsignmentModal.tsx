import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type ConsignmentForm, consignmentSchema } from './flightSchema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { Callout } from '@/components/ui';
import { useUpdateFlightAllocation } from '@/hooks/useJob';
import type { FlightAllocation, FlightInfo, ServiceClass } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';
import { SERVICE_CLASS_LABELS } from '@/lib/utils/request';

const CLASSES = (Object.keys(SERVICE_CLASS_LABELS) as ServiceClass[]).map((value) => ({
  value,
  label: SERVICE_CLASS_LABELS[value],
}));

/** Edit one job's consignment on the flight (US-F3-15): its own waybill, stall positions and class. */
export const ConsignmentModal: FC<{
  flight: FlightInfo;
  allocation: FlightAllocation | null;
  onClose: () => void;
}> = ({ flight, allocation, onClose }) => {
  const { message } = App.useApp();
  const update = useUpdateFlightAllocation();
  const methods = useFormCustom<ConsignmentForm>({
    resolver: zodResolver(consignmentSchema),
    values: {
      airWaybill: allocation?.airWaybill ?? '',
      stallPositions: allocation?.stallPositions ?? 1,
      serviceClass: CLASSES.find((c) => c.value === allocation?.serviceClass) ?? null,
    },
  });

  const close = () => {
    update.reset();
    onClose();
  };

  const onSubmit = methods.handleSubmit((v) => {
    if (!allocation || !flight.id) return;
    update.mutate(
      {
        jobId: allocation.jobId,
        flightId: flight.id,
        input: {
          airWaybill: v.airWaybill || undefined,
          stallPositions: v.stallPositions,
          serviceClass: (v.serviceClass?.value as ServiceClass | undefined) ?? undefined,
        },
      },
      {
        onSuccess: () => {
          message.success(`${allocation.jobCode}'s consignment on ${flight.flightNo} saved.`);
          close();
        },
      },
    );
  });

  return (
    <BaseModal
      open={allocation !== null}
      onCancel={close}
      title={`${allocation?.jobCode ?? ''} on flight ${flight.flightNo}`}
    >
      <FormWrapper
        methods={methods}
        isSubmitting={update.isPending}
        mode="edit"
        onCancel={close}
        onFinish={onSubmit}
        layout="vertical"
        force
      >
        {({ FormField }) => (
          <>
            <FormField
              name="airWaybill"
              label="Air waybill (this job’s own)"
              component="text"
              componentProps={{ maxLength: 20, placeholder: '160-12345675' }}
            />
            <Flex gap={16}>
              <FormField
                name="stallPositions"
                label="Stall positions"
                component="number"
                componentProps={{ isRequired: true, min: 1, max: 99, step: 1 }}
              />
              <FormField
                name="serviceClass"
                label="Service class"
                component="select"
                componentProps={{ options: CLASSES, isClearable: true, placeholder: 'Not set' }}
              />
            </Flex>
            {update.isError && (
              <Callout tone="bad" title="Not saved">
                {apiErrorMessage(update.error, 'Something went wrong. Try again.')}
              </Callout>
            )}
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton label="Save consignment" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};
