import { type FC, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';
import dayjs from 'dayjs';

import { BOOKING_KIND_OPTIONS } from '../vehicleOptions';
import { type BookingForm, bookingSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { useBookVehicle } from '@/hooks/useVehicle';
import type { Vehicle } from '@/interfaces';
import { apiErrorMessage } from '@/lib';

/** Local date and time as the pickers hold it; sent to the server as an ISO instant. */
const LOCAL_DATETIME = 'YYYY-MM-DDTHH:mm';
const SHOWN_DATETIME = 'D MMM YYYY, HH:mm';

type Props = {
  /** The vehicle to book; the modal is open while one is set. */
  vehicle: Vehicle | null;
  onClose: () => void;
};

/** Book slot: hold a vehicle for maintenance, an inspection or a job, on the fleet calendar. */
const BookVehicleModal: FC<Props> = ({ vehicle, onClose }) => {
  const { message } = App.useApp();
  const book = useBookVehicle();
  const methods = useFormCustom<BookingForm>({ resolver: zodResolver(bookingSchema) });
  const startsAt = methods.watch('startsAt');

  useEffect(() => {
    if (!vehicle) return;
    methods.reset({ kind: BOOKING_KIND_OPTIONS[0], startsAt: '', endsAt: '' });
  }, [methods, vehicle]);

  const onSubmit = methods.handleSubmit(async (v) => {
    if (!vehicle) return;
    try {
      await book.mutateAsync({
        vehicleId: vehicle.id,
        kind: v.kind?.value ?? '',
        startsAt: dayjs(v.startsAt).toISOString(),
        endsAt: dayjs(v.endsAt).toISOString(),
      });
      void message.success(`${vehicle.code} booked on the fleet calendar.`);
      onClose();
    } catch (err) {
      methods.setError('form_error', {
        message: apiErrorMessage(err, 'The slot wasn’t booked. Check the times and try again.'),
      });
    }
  });

  return (
    <BaseModal
      open={vehicle !== null}
      onCancel={onClose}
      title={vehicle ? `Book a slot for ${vehicle.code}` : 'Book a slot'}
    >
      <FormWrapper
        methods={methods}
        isSubmitting={book.isPending}
        mode="add"
        onCancel={onClose}
        onFinish={onSubmit}
        layout="vertical"
      >
        {({ FormField }) => (
          <>
            <FormField
              name="kind"
              label="For"
              component="select"
              componentProps={{ isRequired: true, options: BOOKING_KIND_OPTIONS }}
            />
            <Flex gap={16}>
              <FormField
                name="startsAt"
                label="Starts"
                component="datepicker"
                componentProps={{
                  isRequired: true,
                  showTime: { format: 'HH:mm' },
                  format: SHOWN_DATETIME,
                  valueFormat: LOCAL_DATETIME,
                  minDate: dayjs().startOf('day'),
                }}
              />
              <FormField
                name="endsAt"
                label="Ends"
                component="datepicker"
                componentProps={{
                  isRequired: true,
                  showTime: { format: 'HH:mm' },
                  format: SHOWN_DATETIME,
                  valueFormat: LOCAL_DATETIME,
                  minDate: startsAt ? dayjs(startsAt).startOf('day') : dayjs().startOf('day'),
                }}
              />
            </Flex>
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton type="primary" label="Book slot" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};

export default BookVehicleModal;
