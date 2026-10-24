import type { FC } from 'react';
import { App, Flex } from 'antd';

import { Button, Chip, Panel } from '@/components/ui';
import { useCloseJob, useJobClosing } from '@/hooks/useJob';
import type { JobDetail } from '@/interfaces';
import { RoleNameEnum } from '@/interfaces';
import { apiErrorMessage, formatDayTime } from '@/lib/utils';
import { duration } from '@/pages/staff/incidents/incidentFormat';
import { useAuthStore } from '@/stores/authStore';

/**
 * Closing the job (US-F6-04): once delivered, with the handover recorded and no incident open, the logistics manager
 * closes it; it leaves the active boards and keeps whether the horses arrived on time. Shown from the handover on.
 */
export const JobClosingPanel: FC<{ job: JobDetail }> = ({ job }) => {
  const { message } = App.useApp();
  const roles = useAuthStore((state) => state.roles) as string[];
  const manager = roles.includes(RoleNameEnum.LOGISTICS_MANAGER);
  const { data: closing } = useJobClosing(job.id);
  const close = useCloseJob(job.id);
  if (!closing || (job.stage !== 'HANDOVER' && job.stage !== 'CLOSED')) return null;

  if (closing.closed) {
    return (
      <Panel
        title="Closed"
        extra={
          closing.onTime ? (
            <Chip tone="ok">On time</Chip>
          ) : (
            <Chip tone="warn">{duration(closing.lateMinutes ?? 0)} late</Chip>
          )
        }
      >
        <p className="type-body-m m-0 text-ink-2">
          Closed {closing.closedAt ? formatDayTime(closing.closedAt) : ''}
          {closing.closedByName ? ` by ${closing.closedByName}` : ''}.{' '}
          {closing.onTime
            ? `The horses arrived on time, measured against ${closing.measuredAgainst}.`
            : `The horses arrived ${duration(closing.lateMinutes ?? 0)} after ${closing.measuredAgainst}${
                closing.measuredAgainst === 'the arrival window'
                  ? ' closed, less any stopped clock'
                  : ''
              }.`}
        </p>
      </Panel>
    );
  }

  const ready = closing.blockers.length === 0;
  return (
    <Panel title="Close the job">
      <Flex vertical gap={12}>
        <p className="type-body-m m-0 text-ink-2">
          {ready
            ? `${job.code} is delivered and handed over, with no incident open. Closing it takes it off the active boards and records whether the horses arrived on time.`
            : `${job.code} can close once ${closing.blockers.join(', and ')}.`}
        </p>
        {manager && (
          <Flex justify="end">
            <Button
              variant={ready ? 'primary' : 'secondary'}
              disabled={!ready || close.isPending}
              onClick={() =>
                close.mutate(undefined, {
                  onSuccess: (r) =>
                    message.success(
                      `${job.code} closed: ${r.onTime ? 'on time' : `${duration(r.lateMinutes ?? 0)} late`}.`,
                    ),
                  onError: (e) => message.error(apiErrorMessage(e, 'Not closed.')),
                })
              }
            >
              Close the job
            </Button>
          </Flex>
        )}
      </Flex>
    </Panel>
  );
};
