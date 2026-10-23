import type { FC } from 'react';
import { App, Flex } from 'antd';

import BaseModal from '@/components/modal/BaseModal';
import { Button, Callout } from '@/components/ui';
import { useArchiveHorse } from '@/hooks/horse';
import type { Horse } from '@/interfaces';
import { apiErrorView, pronouns } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Archive, never delete (spec §6.2). The API refuses with HORSE_IN_USE while the horse is on an
 * active request or an unclosed job; its sentence is shown and the modal stays open.
 */
const ArchiveHorseModal: FC<{ horse: Horse; open: boolean; onClose: () => void }> = ({
  horse,
  open,
  onClose,
}) => {
  const router = useCustomRouter();
  const { message } = App.useApp();
  const archive = useArchiveHorse();
  const { possessive, object } = pronouns(horse.sex);
  const refusal = archive.isError
    ? apiErrorView(archive.error, {}, 'Something went wrong. Try again.').form
    : null;

  const close = () => {
    archive.reset();
    onClose();
  };

  const confirm = () =>
    archive.mutate(horse.id, {
      onSuccess: () => {
        message.success(`${horse.name} is archived.`);
        router.push(router.paths.get('my-horses', { queryParams: { archived: true } }));
      },
    });

  return (
    <BaseModal open={open} onCancel={close} title={`Archive ${horse.name}?`}>
      <Flex vertical gap={16}>
        <p className="type-body-m m-0 text-ink-2">
          {horse.name} leaves My horses and can’t be put on new requests. {capitalise(possessive)}{' '}
          past requests keep {object}.
        </p>
        {refusal && (
          <Callout tone="bad" title={`${horse.name} can’t be archived yet`}>
            {refusal}
          </Callout>
        )}
        <Flex justify="end" gap={8}>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirm} disabled={archive.isPending}>
            Archive
          </Button>
        </Flex>
      </Flex>
    </BaseModal>
  );
};

export default ArchiveHorseModal;
