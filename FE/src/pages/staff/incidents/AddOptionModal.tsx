import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type OptionForm, optionSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { Callout } from '@/components/ui';
import { useAddIncidentOption } from '@/hooks/incident';
import type { Incident } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

const EMPTY: OptionForm = {
  title: '',
  description: '',
  extraCost: 0,
  delayMinutes: 0,
  changesRoute: false,
};

/** Record an option for handling the incident (US-F5-02), with its estimated cost and delay. */
export const AddOptionModal: FC<{ incident: Incident; open: boolean; onClose: () => void }> = ({
  incident,
  open,
  onClose,
}) => {
  const { message } = App.useApp();
  const add = useAddIncidentOption(incident.id);
  const methods = useFormCustom<OptionForm>({
    resolver: zodResolver(optionSchema),
    defaultValues: EMPTY,
  });

  const close = () => {
    add.reset();
    methods.reset(EMPTY);
    onClose();
  };

  const onSubmit = methods.handleSubmit((v) =>
    add.mutate(
      { ...v, description: v.description || undefined },
      {
        onSuccess: () => {
          message.success(`“${v.title}” added to the options.`);
          close();
        },
      },
    ),
  );

  return (
    <BaseModal open={open} onCancel={close} title="Add an option">
      <FormWrapper
        methods={methods}
        isSubmitting={add.isPending}
        mode="edit"
        onCancel={close}
        onFinish={onSubmit}
        layout="vertical"
        force
      >
        {({ FormField }) => (
          <>
            <FormField
              name="title"
              label="Option"
              component="text"
              componentProps={{
                isRequired: true,
                maxLength: 160,
                placeholder: 'Send a second trailer from Tây Ninh',
              }}
            />
            <FormField
              name="description"
              label="What it involves (optional)"
              component="textarea"
              componentProps={{ rows: 3, maxLength: 1000 }}
            />
            <Flex gap={16}>
              <FormField
                name="extraCost"
                label={`Estimated extra cost, ${incident.currency}`}
                component="number"
                componentProps={{ isRequired: true, min: 0, step: 50 }}
              />
              <FormField
                name="delayMinutes"
                label="Added to the arrival, minutes"
                component="number"
                componentProps={{ isRequired: true, min: 0, step: 15 }}
              />
            </Flex>
            <FormField
              name="changesRoute"
              component="checkbox"
              componentProps={{ children: 'It takes the horses another way (a new route version)' }}
            />
            {add.isError && (
              <Callout tone="bad" title="The option wasn’t added">
                {apiErrorMessage(add.error, 'Something went wrong. Try again.')}
              </Callout>
            )}
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton label="Add option" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};
