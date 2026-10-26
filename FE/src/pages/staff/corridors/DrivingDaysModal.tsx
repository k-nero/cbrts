import { type FC, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type DrivingDaysForm, drivingDaysSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { useSetDrivingDays } from '@/hooks/routeCatalog';
import type { Corridor } from '@/interfaces';
import { apiErrorMessage } from '@/lib';

type Props = {
  /** The route being changed; the modal is closed when null. */
  corridor: Corridor | null;
  onClose: () => void;
};

/**
 * Driving days (US-F7-02): how many days a road route takes to drive one way. It sets a trip's
 * length before its route is planned, and how long an empty drive back along it takes.
 */
const DrivingDaysModal: FC<Props> = ({ corridor, onClose }) => {
  const { message } = App.useApp();
  const save = useSetDrivingDays();
  const methods = useFormCustom<DrivingDaysForm>({ resolver: zodResolver(drivingDaysSchema) });

  useEffect(() => {
    if (corridor) methods.reset({ drivingDays: corridor.drivingDays });
  }, [corridor, methods]);

  const onSubmit = methods.handleSubmit(async (v) => {
    if (!corridor) return;
    try {
      await save.mutateAsync({ id: corridor.id, drivingDays: v.drivingDays });
      void message.success(`${corridor.code} takes ${v.drivingDays} driving days.`);
      onClose();
    } catch (err) {
      methods.setError('form_error', {
        message: apiErrorMessage(err, 'The driving days weren’t saved. Try again.'),
      });
    }
  });

  return (
    <BaseModal
      open={corridor !== null}
      onCancel={onClose}
      title={corridor ? `${corridor.code} · Driving days` : 'Driving days'}
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
              name="drivingDays"
              label="Days to drive it, one way"
              component="number"
              componentProps={{
                isRequired: true,
                min: 1,
                max: 30,
                step: 1,
                instruction:
                  'A trip’s length before its route is planned, and how long an empty drive back takes.',
              }}
            />
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton type="primary" label="Save" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};

export default DrivingDaysModal;
