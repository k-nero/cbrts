import { useCallback } from 'react';
import { App } from 'antd';

import { apiErrorMessage } from '@/lib';

type ConfirmDelete = {
  /** "Delete RD HCM → PNH?" */
  title: string;
  /** What deleting it means, in a sentence. */
  content: string;
  /** Runs the delete; a refusal from the server shows as a message with its sentence. */
  run: () => Promise<unknown>;
  /** The toast once it is gone. */
  done: string;
  /** The fallback when the server gives no sentence. */
  failed: string;
};

/**
 * A Danger confirm before a delete. The server refuses deleting a record something still uses and
 * says what; that sentence is shown as a message and the confirm closes.
 */
export const useConfirmDelete = () => {
  const { modal, message } = App.useApp();
  return useCallback(
    ({ title, content, run, done, failed }: ConfirmDelete) =>
      modal.confirm({
        title,
        content,
        okText: 'Delete',
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            await run();
            void message.success(done);
          } catch (err) {
            void message.error(apiErrorMessage(err, failed));
          }
        },
      }),
    [message, modal],
  );
};
