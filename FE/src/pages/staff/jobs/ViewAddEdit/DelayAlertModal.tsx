import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type DelayAlertForm, delayAlertSchema, etaInIct } from './delayAlertSchema';
import { DelayReasonCards } from './DelayReasonCards';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { Callout } from '@/components/ui';
import { useSendDelayAlert } from '@/hooks/incident';
import type { JobDetail } from '@/interfaces';
import { apiErrorMessage, formatDayTime, ict } from '@/lib/utils';

const LOCAL_DATETIME = 'YYYY-MM-DDTHH:mm';

type Props = { job: JobDetail; plannedArrival: string | null; open: boolean; onClose: () => void };

/**
 * A delay alert (US-F5-04): why the trip is late and the job's new arrival. Sending it moves the stops ahead, opens
 * an incident for the logistics manager, and tells the crew and every customer on the trip their new time.
 */
export const DelayAlertModal: FC<Props> = ({ job, plannedArrival, open, onClose }) => {
  const { message } = App.useApp();
  const send = useSendDelayAlert(job.id);
  const defaults = {
    reason: undefined as unknown as DelayAlertForm['reason'],
    newEta: plannedArrival ? ict(plannedArrival).format(LOCAL_DATETIME) : '',
    note: '',
  };
  const methods = useFormCustom<DelayAlertForm>({
    resolver: zodResolver(delayAlertSchema),
    defaultValues: defaults,
  });

  const close = () => {
    send.reset();
    methods.reset(defaults);
    onClose();
  };

  const onSubmit = methods.handleSubmit((v) =>
    send.mutate(
      { reason: v.reason, newEta: etaInIct(v.newEta), note: v.note || undefined },
      {
        onSuccess: (incident) => {
          message.success(
            `Delay alert sent: ${job.code} now arrives ${incident.etaAt ? formatDayTime(incident.etaAt) : 'later'}.`,
          );
          close();
        },
      },
    ),
  );

  return (
    <BaseModal
      open={open}
      onCancel={close}
      title={`Send a delay alert for ${job.code}`}
      width={640}
    >
      <FormWrapper
        methods={methods}
        isSubmitting={send.isPending}
        mode="edit"
        onCancel={close}
        onFinish={onSubmit}
        layout="vertical"
        force
      >
        {({ FormField }) => (
          <Flex vertical gap={16}>
            <DelayReasonCards />
            <FormField
              name="newEta"
              label="New arrival (Indochina Time)"
              component="datepicker"
              componentProps={{
                isRequired: true,
                instruction: plannedArrival
                  ? `Planned now: ${formatDayTime(plannedArrival)}.`
                  : undefined,
                showTime: { format: 'HH:mm' },
                format: 'D MMM YYYY, HH:mm',
                valueFormat: LOCAL_DATETIME,
              }}
            />
            <FormField
              name="note"
              label={`Note (the crew and ${job.code}'s customer read it as written)`}
              component="textarea"
              componentProps={{ rows: 3, maxLength: 500 }}
            />
            <p className="type-body-s m-0 text-ink-3">
              The stops still ahead move by the delay. Every customer on the trip hears the reason
              and their own new time, and the logistics manager gets an incident to close.
            </p>
            {send.isError && (
              <Callout tone="bad" title="Not sent">
                {apiErrorMessage(send.error, 'Something went wrong. Try again.')}
              </Callout>
            )}
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton label="Send the alert" />
            </Flex>
          </Flex>
        )}
      </FormWrapper>
    </BaseModal>
  );
};
