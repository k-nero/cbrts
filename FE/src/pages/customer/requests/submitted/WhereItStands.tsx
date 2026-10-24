import type { FC } from 'react';
import { Flex } from 'antd';

import { Chip, Deadline, Panel, StageMark } from '@/components/ui';
import type { TransportRequest } from '@/interfaces';
import { nextStepDeadline, requestStage, requestStatusChip } from '@/lib/utils';

/**
 * Where the request stands (US-F1-08): its status and stage, then the next step with the one who owns it
 * and its two-line deadline. A request with nothing more to happen says so.
 */
export const WhereItStands: FC<{ request: TransportRequest }> = ({ request }) => {
  const status = requestStatusChip(request.status);
  const stage = requestStage(request.status);
  const step = request.nextStep ?? null;
  const deadline = step && nextStepDeadline(step, request, new Date().toISOString());
  return (
    <Panel title="Where it stands" extra={<Chip tone={status.tone}>{status.label}</Chip>}>
      <Flex vertical gap={16}>
        {stage && <StageMark stage={stage} />}
        {step ? (
          <Flex align="center" gap={16} className="border-t border-line pt-4">
            <Flex vertical gap={4} className="min-w-0 flex-1">
              <span className="type-caption text-ink-3">Next</span>
              <span className="type-label-m text-ink">{step.action}</span>
              <span className="type-body-s text-ink-2">
                {step.yours ? 'You do this' : `${step.owner} does this`}
              </span>
            </Flex>
            {deadline && (
              <Deadline left={deadline.left} date={deadline.date} tone={deadline.tone} />
            )}
          </Flex>
        ) : (
          <p className="type-body-m m-0 border-t border-line pt-4 text-ink-2">
            Nothing more happens on this request.
          </p>
        )}
      </Flex>
    </Panel>
  );
};
