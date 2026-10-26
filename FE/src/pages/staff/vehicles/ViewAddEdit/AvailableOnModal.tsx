import { type FC, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type AvailableOnForm, availableOnSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { Button } from '@/components/ui';
import { useSetAvailableOn } from '@/hooks/useVehicle';
import type { Vehicle } from '@/interfaces';
import { apiErrorMessage, formatDate } from '@/lib/utils';

type Props = {
  /** The vehicle being changed; the modal is closed when null. */
  vehicle: Vehicle | null;
  onClose: () => void;
};

/**
 * Expected back (US-F7-02): the date the coordinator expects a vehicle to be available again, for
 * what the fleet calendar doesn't know (repairs, a delay abroad). It counts only while it is later
 * than the date worked out from the bookings.
 */
const AvailableOnModal: FC<Props> = ({ vehicle, onClose }) => {
  const { message } = App.useApp();
  const save = useSetAvailableOn();
  const methods = useFormCustom<AvailableOnForm>({ resolver: zodResolver(availableOnSchema) });

  useEffect(() => {
    if (vehicle) methods.reset({ availableOn: vehicle.availableOn ?? '' });
  }, [methods, vehicle]);

  const apply = async (availableOn: string | null) => {
    if (!vehicle) return;
    try {
      await save.mutateAsync({ id: vehicle.id, availableOn });
      void message.success(
        availableOn
          ? `${vehicle.code} is expected back on ${formatDate(availableOn)}.`
          : `${vehicle.code}’s expected date is cleared.`,
      );
      onClose();
    } catch (err) {
      methods.setError('form_error', {
        message: apiErrorMessage(err, 'The date wasn’t saved. Try again.'),
      });
    }
  };

  const onSubmit = methods.handleSubmit((v) => apply(v.availableOn));

  return (
    <BaseModal
      open={vehicle !== null}
      onCancel={onClose}
      title={vehicle ? `${vehicle.code} · Expected back` : 'Expected back'}
    >
      <FormWrapper
        methods={methods}
        isSubmitting={save.isPending}
        mode="edit"
        onCancel={onClose}
        onFinish={onSubmit}
        layout="vertical"
      >
        {({ FormField }) => (
          <>
            <FormField
              name="availableOn"
              label="Expected back on"
              component="datepicker"
              componentProps={{
                isRequired: true,
                format: 'D MMM YYYY',
                instruction:
                  'For what the fleet calendar doesn’t know, such as repairs or a delay abroad. It counts only when it’s later than the calendar’s date.',
              }}
            />
            <Flex justify="space-between" gap={8}>
              {vehicle?.availableOn ? (
                <Button
                  variant="ghost"
                  size="md"
                  disabled={save.isPending}
                  onClick={() => void apply(null)}
                >
                  Clear the date
                </Button>
              ) : (
                <span />
              )}
              <Flex gap={8}>
                <CancelButton label="Cancel" />
                <SubmitButton type="primary" label="Save" />
              </Flex>
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};

export default AvailableOnModal;
