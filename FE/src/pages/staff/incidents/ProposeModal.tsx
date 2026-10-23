import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { duration, money } from './incidentFormat';
import { type ProposeForm, proposeSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { Callout } from '@/components/ui';
import { useProposeIncidentOption } from '@/hooks/incident';
import type { Incident, IncidentOption } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

/** Propose one option for the logistics manager's approval (US-F5-02); the note says why this one. */
export const ProposeModal: FC<{
  incident: Incident;
  option: IncidentOption | null;
  onClose: () => void;
}> = ({ incident, option, onClose }) => {
  const { message } = App.useApp();
  const propose = useProposeIncidentOption(incident.id);
  const methods = useFormCustom<ProposeForm>({
    resolver: zodResolver(proposeSchema),
    defaultValues: { note: '' },
  });

  const close = () => {
    propose.reset();
    methods.reset({ note: '' });
    onClose();
  };

  const onSubmit = methods.handleSubmit((v) => {
    if (!option) return;
    propose.mutate(
      { optionId: option.id, note: v.note || undefined },
      {
        onSuccess: () => {
          message.success(`Proposed to ${incident.ownerName ?? 'the logistics manager'}.`);
          close();
        },
      },
    );
  });

  return (
    <BaseModal open={option !== null} onCancel={close} title={`Propose “${option?.title ?? ''}”?`}>
      <Flex vertical gap={16}>
        {option && (
          <p className="type-body-m m-0 text-ink-2">
            {`${incident.ownerName ?? 'The logistics manager'} decides. It costs ${
              option.extraCost > 0 ? money(incident.currency, option.extraCost) : 'nothing extra'
            } and adds ${option.delayMinutes > 0 ? duration(option.delayMinutes) : 'no delay'}${
              option.changesRoute ? ', with a new route' : ''
            }. The options stay as they are until then.`}
          </p>
        )}
        <FormWrapper
          methods={methods}
          isSubmitting={propose.isPending}
          mode="edit"
          onCancel={close}
          onFinish={onSubmit}
          layout="vertical"
          force
        >
          {({ FormField }) => (
            <>
              <FormField
                name="note"
                label="Why this one (optional)"
                component="textarea"
                componentProps={{ rows: 3, maxLength: 1000 }}
              />
              {propose.isError && (
                <Callout tone="bad" title="Not proposed">
                  {apiErrorMessage(propose.error, 'Something went wrong. Try again.')}
                </Callout>
              )}
              <Flex justify="end" gap={8}>
                <CancelButton label="Cancel" />
                <SubmitButton label="Propose for approval" />
              </Flex>
            </>
          )}
        </FormWrapper>
      </Flex>
    </BaseModal>
  );
};
