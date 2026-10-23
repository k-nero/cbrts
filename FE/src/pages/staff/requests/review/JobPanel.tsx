import type { FC } from 'react';
import { Flex } from 'antd';

import { Button, Chip, Panel } from '@/components/ui';
import type { JobRef } from '@/interfaces';
import { useCustomRouter } from '@/router/route.hook';

/** An approved request: the job it became and the team on it (US-F1-07). */
export const JobPanel: FC<{ job: JobRef }> = ({ job }) => {
  const router = useCustomRouter();
  const rows: [string, string | null][] = [
    ['Transport specialist', job.transportSpecialist],
    ['Fleet & route coordinator', job.coordinator],
  ];
  return (
    <Panel title="Approved" extra={<Chip tone="ok">Job created</Chip>}>
      <Flex vertical gap={16}>
        <span className="type-data-l text-ink">{job.code}</span>
        <Flex vertical gap={8}>
          {rows.map(([label, name]) => (
            <Flex key={label} justify="space-between" gap={12}>
              <span className="type-label-s text-ink-2">{label}</span>
              <span className="type-body-s text-ink">{name ?? 'Not assigned'}</span>
            </Flex>
          ))}
        </Flex>
        <Button
          variant="secondary"
          block
          trailingIcon="arrow-right"
          onClick={() => router.push(router.paths.get('job-detail', { pathParams: [job.id] }))}
        >
          {`Open ${job.code}`}
        </Button>
      </Flex>
    </Panel>
  );
};
