import type { FC } from 'react';
import { App, Flex } from 'antd';

import BaseModal from '@/components/modal/BaseModal';
import { Button, Callout } from '@/components/ui';
import { useCancelRequest } from '@/hooks/request';
import { apiErrorMessage } from '@/lib/utils';

/**
 * Cancel a submitted request before approval (BR-F1-07). `fee` says what it costs today: the
 * quotation's current cancellation band, or that there is no fee before a quotation is issued.
 */
const CancelRequestModal: FC<{
  requestId: string;
  code: string;
  fee: string;
  open: boolean;
  onClose: () => void;
}> = ({ requestId, code, fee, open, onClose }) => {
  const { message } = App.useApp();
  const cancel = useCancelRequest(requestId);

  const close = () => {
    cancel.reset();
    onClose();
  };

  const confirm = () =>
    cancel.mutate(undefined, {
      onSuccess: () => {
        message.success(`${code} is cancelled.`);
        close();
      },
    });

  return (
    <BaseModal open={open} onCancel={close} title={`Cancel ${code}?`}>
      <Flex vertical gap={16}>
        <Flex vertical gap={8}>
          <p className="type-body-m m-0 text-ink-2">
            The request closes and can’t be reopened. To move these horses later, send a new
            request.
          </p>
          <p className="type-body-m m-0 text-ink-2">{fee}</p>
        </Flex>
        {cancel.isError && (
          <Callout tone="bad" title="This request can’t be cancelled">
            {apiErrorMessage(cancel.error, 'Something went wrong. Try again.')}
          </Callout>
        )}
        <Flex justify="end" gap={8}>
          <Button variant="ghost" onClick={close}>
            Keep it
          </Button>
          <Button variant="danger" onClick={confirm} disabled={cancel.isPending}>
            Cancel request
          </Button>
        </Flex>
      </Flex>
    </BaseModal>
  );
};

export default CancelRequestModal;
