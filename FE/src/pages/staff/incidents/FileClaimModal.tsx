import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type ClaimForm, claimSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { Callout } from '@/components/ui';
import { useFileInsuranceClaim } from '@/hooks/incident';
import type { Incident } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

const EMPTY: ClaimForm = { insurer: '', reference: '', claimedAmount: 0, note: '' };

/** File the insurance claim on an incident (US-F5-08): the insurer, their reference and the amount claimed. */
export const FileClaimModal: FC<{ incident: Incident; open: boolean; onClose: () => void }> = ({
  incident,
  open,
  onClose,
}) => {
  const { message } = App.useApp();
  const file = useFileInsuranceClaim(incident.id);
  const methods = useFormCustom<ClaimForm>({
    resolver: zodResolver(claimSchema),
    defaultValues: EMPTY,
  });

  const close = () => {
    file.reset();
    methods.reset(EMPTY);
    onClose();
  };

  const onSubmit = methods.handleSubmit((v) =>
    file.mutate(
      {
        insurer: v.insurer,
        reference: v.reference,
        claimedAmount: v.claimedAmount,
        note: v.note || undefined,
      },
      {
        onSuccess: () => {
          message.success(`Claim filed with ${v.insurer}. The customer is told.`);
          close();
        },
      },
    ),
  );

  return (
    <BaseModal open={open} onCancel={close} title="File an insurance claim">
      <FormWrapper
        methods={methods}
        isSubmitting={file.isPending}
        mode="edit"
        onCancel={close}
        onFinish={onSubmit}
        layout="vertical"
        force
      >
        {({ FormField }) => (
          <>
            <FormField
              name="insurer"
              label="Insurer"
              component="text"
              componentProps={{ isRequired: true, maxLength: 120, placeholder: 'PVI Insurance' }}
            />
            <Flex gap={16}>
              <FormField
                name="reference"
                label="Insurer's claim reference"
                component="text"
                componentProps={{ isRequired: true, maxLength: 60, placeholder: 'PVI-2026-0412' }}
              />
              <FormField
                name="claimedAmount"
                label={`Amount claimed, ${incident.currency}`}
                component="number"
                componentProps={{ isRequired: true, min: 0, step: 100 }}
              />
            </Flex>
            <FormField
              name="note"
              label="Note for the record (optional)"
              component="textarea"
              componentProps={{ rows: 3, maxLength: 500 }}
            />
            {file.isError && (
              <Callout tone="bad" title="Not filed">
                {apiErrorMessage(file.error, 'Something went wrong. Try again.')}
              </Callout>
            )}
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton label="File the claim" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};
