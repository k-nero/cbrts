import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type ResolveForm, resolveSchema } from './schema';

import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import { Callout, Panel } from '@/components/ui';
import { useResolveIncident } from '@/hooks/incident';
import type { Incident } from '@/interfaces';
import { IncidentStatusEnum } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

/**
 * The logistics manager closes the incident (US-F5-05): how it ended and a closing note, both required. Once a
 * decision is carried out, closing is the page's one forward action; an open incident can also be closed without one
 * (the jam cleared), as a Secondary beside the options.
 */
export const CloseIncident: FC<{ incident: Incident }> = ({ incident }) => {
  const { message } = App.useApp();
  const resolve = useResolveIncident(incident.id);
  const methods = useFormCustom<ResolveForm>({
    resolver: zodResolver(resolveSchema),
    defaultValues: { resolution: '', closingNote: '' },
  });
  const decided = incident.status === IncidentStatusEnum.DECIDED;

  const onSubmit = methods.handleSubmit((v) =>
    resolve.mutate(v, {
      onSuccess: () => message.success(`Closed. ${incident.jobCode}'s trip record keeps it.`),
    }),
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
