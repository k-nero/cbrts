import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type ReturnForm, returnSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { Callout } from '@/components/ui';
import { useReturnIncidentProposal } from '@/hooks/incident';
import type { Incident } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

/** Send the proposal back (US-F5-03): whoever proposed it hears why, and the options unlock. */
export const ReturnModal: FC<{ incident: Incident; open: boolean; onClose: () => void }> = ({
  incident,
  open,
  onClose,
}) => {
  const { message } = App.useApp();
  const sendBack = useReturnIncidentProposal(incident.id);
  const methods = useFormCustom<ReturnForm>({
    resolver: zodResolver(returnSchema),
    defaultValues: { reason: '' },
  });

  const close = () => {
    sendBack.reset();
    methods.reset({ reason: '' });
    onClose();
  };

  const onSubmit = methods.handleSubmit((v) =>
    sendBack.mutate(v.reason, {
      onSuccess: () => {
        message.success(`Sent back to ${incident.proposedByName ?? 'the coordinator'}.`);
        close();
      },
    }),
  );

  return (
    <BaseModal open={open} onCancel={close} title="Send the proposal back?">
      <FormWrapper
        methods={methods}
        isSubmitting={sendBack.isPending}
        mode="edit"
        onCancel={close}
        onFinish={onSubmit}
        layout="vertical"
        force
      >
        {({ FormField }) => (
          <>
            <FormField
              name="reason"
              label={`Why (${incident.proposedByName ?? 'the coordinator'} reads it)`}
              component="textarea"
              componentProps={{ rows: 3, maxLength: 1000, isRequired: true }}
            />
            {sendBack.isError && (
              <Callout tone="bad" title="Not sent back">
                {apiErrorMessage(sendBack.error, 'Something went wrong. Try again.')}
              </Callout>
            )}
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton label="Send back" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};
