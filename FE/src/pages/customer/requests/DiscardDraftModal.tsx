import type { FC } from 'react';
import { App, Flex } from 'antd';

import BaseModal from '@/components/modal/BaseModal';
import { Button, Callout } from '@/components/ui';
import { useDiscardRequest } from '@/hooks/request';
import { apiErrorMessage } from '@/lib/utils';

/** Discard a draft (spec §7): it was never submitted, so nothing else changes. */
const DiscardDraftModal: FC<{ id: string | null; onClose: () => void }> = ({ id, onClose }) => {
  const { message } = App.useApp();
  const discard = useDiscardRequest();

  const close = () => {
    discard.reset();
    onClose();
  };

  const confirm = () => {
    if (!id) return;
    discard.mutate(id, {
      onSuccess: () => {
        message.success('Draft discarded.');
        close();
      },
    });
  };

  return (
    <BaseModal open={id !== null} onCancel={close} title="Discard this draft?">
      <Flex vertical gap={16}>
        <p className="type-body-m m-0 text-ink-2">
          It’s deleted. Nothing was submitted, so nothing else changes.
        </p>
        {discard.isError && (
          <Callout tone="bad" title="This draft can’t be discarded">
            {apiErrorMessage(discard.error, 'Something went wrong. Try again.')}
          </Callout>
        )}
        <Flex justify="end" gap={8}>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirm} disabled={discard.isPending}>
            Discard
          </Button>
        </Flex>
      </Flex>
    </BaseModal>
  );
};

export default DiscardDraftModal;
