import type { FC } from 'react';
import { App, Flex } from 'antd';

import { Button, Chip } from '@/components/ui';
import { useCanSignOffTripPlan, useSignOffTripPlan } from '@/hooks/useJob';
import type { JobDetail } from '@/interfaces';
import { formatDayTime } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/error';

/**
 * Signs off the trip plan (US-F3-08). Only the logistics manager may; anyone else sees who will instead of a
 * button the API refuses. Once signed off it says when and by whom: a change to the plan clears it.
 */
export const SignOffButton: FC<{ job: JobDetail }> = ({ job }) => {
  const { message } = App.useApp();
  const canSignOff = useCanSignOffTripPlan();
  const signOffMutation = useSignOffTripPlan(job.id);

  if (job.tripSignedOffAt) {
    return (
      <Flex vertical gap={4} align="start">
        <Chip tone="ok">Signed off</Chip>
        <span className="type-body-s text-ink-3">
          {job.tripSignedOffBy ? `${job.tripSignedOffBy}, ` : ''}
          {formatDayTime(job.tripSignedOffAt)}. A change to the route, load or crew needs a new
          sign-off.
        </span>
      </Flex>
    );
  }
  if (!canSignOff) {
    return (
      <span className="type-body-s text-ink-3">The logistics manager signs off the trip plan.</span>
    );
  }
  return (
    <Button
      variant="primary"
      size="md"
      disabled={signOffMutation.isPending}
      onClick={() =>
        signOffMutation.mutate(undefined, {
          onSuccess: () => message.success('Trip plan signed off. The crew has been told.'),
          onError: (error) =>
            message.error(
              apiErrorMessage(error, 'The trip plan couldn’t be signed off. Try again.'),
            ),
        })
      }
    >
      {signOffMutation.isPending ? 'Signing off...' : 'Sign off trip plan'}
    </Button>
  );
};
