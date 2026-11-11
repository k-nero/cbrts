import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { money } from './incidentFormat';
import { type ClaimOutcomeForm, claimOutcomeSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { Callout } from '@/components/ui';
import { useInsuranceClaimOutcome } from '@/hooks/incident';
import type { Incident, InsuranceClaim } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

/**
 * The insurer's answer to a claim (US-F5-08): settled with what they paid (at most what was claimed), or declined
 * with the reason. Either is final, and the customer is told.
 */
export const ClaimOutcomeModal: FC<{
  incident: Incident;
  claim: InsuranceClaim;
  outcome: ClaimOutcomeForm['outcome'] | null;
  onClose: () => void;
}> = ({ incident, claim, outcome, onClose }) => {
  const { message } = App.useApp();
  const record = useInsuranceClaimOutcome(incident.id);
  const methods = useFormCustom<ClaimOutcomeForm>({
    resolver: zodResolver(claimOutcomeSchema),
    values: {
      outcome: outcome ?? 'SETTLED',
      settledAmount: claim.claimedAmount,
      declineReason: '',
    },
  });
  const settling = outcome === 'SETTLED';

  const close = () => {
    record.reset();
    onClose();
  };

  const onSubmit = methods.handleSubmit((v) =>
    record.mutate(
      v.outcome === 'SETTLED'
        ? { outcome: 'SETTLED', settledAmount: v.settledAmount ?? undefined }
        : { outcome: 'DECLINED', declineReason: v.declineReason },
      {
        onSuccess: () => {
          message.success(`Claim ${claim.reference} ${settling ? 'settled' : 'declined'}.`);
          close();
        },
      },
    ),
  );

  return (
    <BaseModal
      open={outcome !== null}
      onCancel={close}
      title={settling ? `Claim ${claim.reference} settled` : `Claim ${claim.reference} declined`}
    >
      <FormWrapper
        methods={methods}
        isSubmitting={record.isPending}
        mode="edit"
        onCancel={close}
        onFinish={onSubmit}
        layout="vertical"
        force
      >
        {({ FormField }) => (
          <>
            {settling ? (
              <FormField
                name="settledAmount"
                label={`What ${claim.insurer} paid, ${incident.currency} (claimed ${money(incident.currency, claim.claimedAmount)})`}
                component="number"
                componentProps={{ isRequired: true, min: 0, max: claim.claimedAmount, step: 100 }}
              />
            ) : (
              <FormField
                name="declineReason"
                label="Why the insurer declined it (the customer reads it)"
                component="textarea"
                componentProps={{ rows: 3, maxLength: 300, isRequired: true }}
              />
            )}
            {record.isError && (
              <Callout tone="bad" title="Not recorded">
                {apiErrorMessage(record.error, 'Something went wrong. Try again.')}
              </Callout>
            )}
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton label={settling ? 'Record the payment' : 'Record the refusal'} />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};
