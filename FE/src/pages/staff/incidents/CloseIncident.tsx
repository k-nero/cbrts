import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';
import { useWatch } from 'react-hook-form';

import { money } from './incidentFormat';
import { type ResolveForm, resolveSchema } from './schema';

import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import { Callout, Panel } from '@/components/ui';
import { useResolveIncident } from '@/hooks/incident';
import type { Incident } from '@/interfaces';
import { IncidentStatusEnum } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

/**
 * The logistics manager closes the incident (US-F5-05): how it ended and a closing note, both required. Closing can
 * also compensate the customer (US-F5-07): an amount and the reason, credited on the job's final invoice. Once a
 * decision is carried out, closing is the page's one forward action; an open incident can also be closed without one
 * (the jam cleared), as a Secondary beside the options.
 */
export const CloseIncident: FC<{ incident: Incident }> = ({ incident }) => {
  const { message } = App.useApp();
  const resolve = useResolveIncident(incident.id);
  const methods = useFormCustom<ResolveForm>({
    resolver: zodResolver(resolveSchema),
    defaultValues: {
      resolution: '',
      closingNote: '',
      compensate: false,
      compensationAmount: null,
      compensationReason: '',
    },
  });
  const decided = incident.status === IncidentStatusEnum.DECIDED;
  const compensate = useWatch({ control: methods.control, name: 'compensate' }) ?? false;
  const amount = useWatch({ control: methods.control, name: 'compensationAmount' });

  const onSubmit = methods.handleSubmit((v) =>
    resolve.mutate(
      {
        resolution: v.resolution,
        closingNote: v.closingNote,
        compensation:
          v.compensate && v.compensationAmount
            ? { amount: v.compensationAmount, reason: v.compensationReason }
            : undefined,
      },
      {
        onSuccess: () => message.success(`Closed. ${incident.jobCode}'s trip record keeps it.`),
      },
    ),
  );

  return (
    <Panel title="Close the incident">
      <FormWrapper
        methods={methods}
        isSubmitting={resolve.isPending}
        mode="edit"
        onFinish={onSubmit}
        layout="vertical"
        force
      >
        {({ FormField }) => (
          <>
            <FormField
              name="resolution"
              label="How it ended"
              component="text"
              componentProps={{
                maxLength: 300,
                isRequired: true,
                placeholder: 'Second trailer delivered both horses at 17:40',
              }}
            />
            <FormField
              name="closingNote"
              label="Closing note for the record"
              component="textarea"
              componentProps={{ rows: 3, maxLength: 1000, isRequired: true }}
            />
            <FormField
              name="compensate"
              component="checkbox"
              componentProps={{ children: 'Compensate the customer' }}
            />
            {compensate && (
              <>
                <FormField
                  name="compensationAmount"
                  label={`Amount, ${incident.currency}`}
                  component="number"
                  componentProps={{ isRequired: true, min: 0, step: 50 }}
                />
                <FormField
                  name="compensationReason"
                  label="Why (the customer reads it on the final invoice)"
                  component="text"
                  componentProps={{
                    maxLength: 300,
                    isRequired: true,
                    placeholder: 'Two days’ delay after the breakdown on QL22',
                  }}
                />
                <span className="type-body-s text-ink-3">
                  {amount && amount > 0
                    ? `${money(incident.currency, amount)} is credited on ${incident.jobCode}’s final invoice, and the customer is told.`
                    : `Credited on ${incident.jobCode}’s final invoice, and the customer is told.`}
                </span>
              </>
            )}
            {resolve.isError && (
              <Callout tone="bad" title="Not closed">
                {apiErrorMessage(resolve.error, 'Something went wrong. Try again.')}
              </Callout>
            )}
            <Flex justify="end" align="center" gap={12}>
              <span className="type-body-s text-ink-3">
                {incident.coordinatorName ?? 'The coordinator'} is told; the job keeps the timeline.
              </span>
              <SubmitButton type={decided ? 'primary' : 'default'} label="Close the incident" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </Panel>
  );
};
