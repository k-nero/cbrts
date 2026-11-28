import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Flex } from 'antd';

import type { RunWrite } from './editorOptions';
import { type BestPriceForm, bestPriceSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { useAnswerBestPrice } from '@/hooks/staffRequest';

/**
 * Answer the club's counter-offer without a new version (spec 2026-11-23): the version stands as the best
 * price, and the club reads the message, quoted, beside the version it can still accept or decline.
 */
export const BestPriceModal: FC<{
  requestId: string;
  versionNo: number;
  club: string;
  open: boolean;
  run: RunWrite;
  onClose: () => void;
}> = ({ requestId, versionNo, club, open, run, onClose }) => {
  const answer = useAnswerBestPrice();
  const methods = useFormCustom<BestPriceForm>({
    resolver: zodResolver(bestPriceSchema),
    defaultValues: { message: '' },
  });

  const close = () => {
    methods.reset();
    onClose();
  };

  const onSubmit = methods.handleSubmit(async (v) => {
    const ok = await run(
      () => answer.mutateAsync({ requestId, value: v.message.trim() }),
      'Best price sent',
    );
    if (ok) close();
  });

  return (
    <BaseModal open={open} onCancel={close} title="Answer: best price">
      <Flex vertical gap={16}>
        <p className="type-body-m m-0 text-ink-2">
          {`Version ${versionNo} stays as it is. ${club} reads your message and can still accept or decline it.`}
        </p>
        <FormWrapper
          methods={methods}
          isSubmitting={answer.isPending}
          mode="edit"
          onCancel={close}
          onFinish={onSubmit}
          layout="vertical"
          force
        >
          {({ FormField }) => (
            <>
              <FormField
                name="message"
                label="Why this is your best price"
                component="textarea"
                componentProps={{ isRequired: true, rows: 3, maxLength: 500 }}
              />
              <Flex justify="end" gap={8}>
                <CancelButton label="Not now" />
                <SubmitButton type="primary" label="Send best price" />
              </Flex>
            </>
          )}
        </FormWrapper>
      </Flex>
    </BaseModal>
  );
};
