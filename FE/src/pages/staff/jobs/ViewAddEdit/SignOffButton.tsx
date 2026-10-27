import type { FC } from 'react';
import { App } from 'antd';

import { Button } from '@/components/ui';
import { useCanSignOffTripPlan, useSignOffTripPlan } from '@/hooks/useJob';
import { apiErrorMessage } from '@/lib/utils/error';

/**
 * Signs off the trip plan (US-F3-08). Only the logistics manager may; anyone else sees who will instead of a
 * button the API refuses.
 */
export const SignOffButton: FC<{ jobId: string }> = ({ jobId }) => {
  const { message } = App.useApp();
  const canSignOff = useCanSignOffTripPlan();
  const signOffMutation = useSignOffTripPlan(jobId);

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
