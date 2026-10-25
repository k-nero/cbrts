import type { FC } from 'react';
import { App, Flex } from 'antd';

import BaseModal from '@/components/modal/BaseModal';
import { Button, Callout } from '@/components/ui';
import { useAcceptQuotation } from '@/hooks/request';
import type { CustomerQuotation } from '@/interfaces';
import { apiErrorCode, apiErrorMessage, cancellationToday, depositText, money } from '@/lib/utils';

/**
 * Accept the quotation (US-F1-06): says what the club commits to before it does, the total, the
 * deposit and what cancelling would cost today (US-Q-08), then binds this one version.
 */
export const AcceptQuotationModal: FC<{
  quotation: CustomerQuotation;
  open: boolean;
  onClose: () => void;
  /** A newer version was issued since the page loaded: the panel says so and reloads it. */
  onVersionChanged: (sentence: string) => void;
}> = ({ quotation, open, onClose, onVersionChanged }) => {
  const { message } = App.useApp();
  const accept = useAcceptQuotation(quotation.request.id);
  const manager = quotation.preparedBy?.name ?? 'The logistics manager';
  const total = quotation.totals.total;

  const close = () => {
    accept.reset();
    onClose();
  };

  // The answer binds the version on screen; a newer one is refused, never accepted unseen (US-Q-07).
  const confirm = () =>
    accept.mutate(quotation.versionNo, {
      onSuccess: () => {
        message.success(`You accepted version ${quotation.versionNo}.`);
        close();
      },
      onError: (error) => {
        if (apiErrorCode(error) !== 'QUOTATION_VERSION_CHANGED') return;
        close();
        onVersionChanged(apiErrorMessage(error, 'A newer version was issued. Read it first.'));
      },
    });

  return (
    <BaseModal open={open} onCancel={close} title={`Accept version ${quotation.versionNo}?`}>
      <Flex vertical gap={16}>
        <Flex vertical gap={8}>
          <p className="type-body-m m-0 text-ink-2">
            {`You accept ${quotation.code} version ${quotation.versionNo}`}
            {total == null ? '' : ` at ${money(total, quotation.currency)}`}
            {`. ${manager} then approves the job, which locks the price and the horse list.`}
          </p>
          {quotation.deposit && (
            <p className="type-body-m m-0 text-ink-2">
              {`Deposit: ${depositText(quotation.deposit, quotation.currency)}.`}
            </p>
          )}
          <p className="type-body-s m-0 text-ink-3">{cancellationToday(quotation)}</p>
        </Flex>
        {accept.isError && (
          <Callout tone="bad" title="This quotation can’t be accepted">
            {apiErrorMessage(accept.error, 'Something went wrong. Try again.')}
          </Callout>
        )}
        <Flex justify="end" gap={8}>
          <Button variant="ghost" onClick={close}>
            Not yet
          </Button>
          <Button
            variant="primary"
            leadingIcon="check"
            onClick={confirm}
            disabled={accept.isPending}
          >
            Accept quotation
          </Button>
        </Flex>
      </Flex>
    </BaseModal>
  );
};
