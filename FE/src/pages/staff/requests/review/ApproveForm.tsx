import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type ApproveForm as ApproveValues, approveSchema } from './schema';

import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import { Callout } from '@/components/ui';
import { useApproveRequest } from '@/hooks/staffRequest';
import type { ApprovalOptions, RequestReview, TeamMember } from '@/interfaces';
import { apiErrorMessage, teamOption } from '@/lib/utils';

/** The suggested person as the select's option; none when there is nobody to suggest. */
const pick = (people: TeamMember[], id: string | null) => {
  const m = people.find((p) => p.id === id);
  return m ? teamOption(m) : undefined;
};

/**
 * The team and the Approve button (US-F1-07). Mounted once the options are loaded, so the suggestions
 * (fewest open jobs) are the form's starting values; the manager can change either.
 */
export const ApproveForm: FC<{ review: RequestReview; options: ApprovalOptions }> = ({
  review,
  options,
}) => {
  const { message } = App.useApp();
  const { request } = review;
  const approve = useApproveRequest();
  const methods = useFormCustom<ApproveValues>({
    resolver: zodResolver(approveSchema),
    defaultValues: {
      transportSpecialist: pick(options.specialists, options.suggestedSpecialistId),
      coordinator: pick(options.coordinators, options.suggestedCoordinatorId),
    },
  });

  const onSubmit = methods.handleSubmit((v) =>
    approve.mutate(
      {
        id: request.id,
        value: {
          transportSpecialistId: v.transportSpecialist.value,
          coordinatorId: v.coordinator.value,
        },
      },
      {
        onSuccess: (r) =>
          void message.success(
            r.job ? `Approved: job ${r.job.code} is created.` : `Approved ${request.code}.`,
          ),
      },
    ),
  );

  return (
    <FormWrapper
      methods={methods}
      isSubmitting={approve.isPending}
      mode="edit"
      onFinish={onSubmit}
      layout="vertical"
      force
    >
      {({ FormField }) => (
        <Flex vertical gap={4}>
          <FormField
            name="transportSpecialist"
            label="Transport specialist (documents and clearance)"
            component="select"
            componentProps={{ isRequired: true, options: options.specialists.map(teamOption) }}
          />
          <FormField
            name="coordinator"
            label="Fleet & route coordinator (planning)"
            component="select"
            componentProps={{ isRequired: true, options: options.coordinators.map(teamOption) }}
          />
          {approve.isError && (
            <Callout tone="bad" title="The request wasn’t approved">
              {apiErrorMessage(approve.error, 'Something went wrong. Try again.')}
            </Callout>
          )}
          <SubmitButton type="primary" block label="Approve and create the job" />
        </Flex>
      )}
    </FormWrapper>
  );
};
