import { type FC, useMemo } from 'react';
import { type Resolver, useController, useFormState, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { App, Flex } from 'antd';
import type { AxiosError } from 'axios';

import {
  makeNegotiateSchema,
  type NegotiableLine,
  type NegotiateValues,
  toCounterOfferBody,
} from './negotiateSchema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { Callout, Checkbox, Chip } from '@/components/ui';
import { queryKeys } from '@/constant/query';
import { useSendCounterOffer } from '@/hooks/request';
import type { CustomerQuotation, CustomerQuoteLine } from '@/interfaces';
import { apiErrorMessage, money } from '@/lib/utils';

/** A line's tick: one field per line, so ticking shows that line's price and reason. */
const Tick: FC<{ lineKey: string; label: string }> = ({ lineKey, label }) => {
  const { field } = useController<NegotiateValues, `asks.${string}.ticked`>({
    name: `asks.${lineKey}.ticked`,
  });
  return (
    <Checkbox
      label={label}
      checked={(field.value as unknown) === true}
      onChange={(e) => field.onChange(e.target.checked)}
    />
  );
};

/** The asks error ("Tick at least one line…"), which belongs to no single field. */
const AsksError: FC = () => {
  const { errors } = useFormState<NegotiateValues>();
  const message = (errors.asks as { message?: string } | undefined)?.message;
  return message ? <Callout tone="bad" title={message} /> : null;
};

/**
 * Negotiate quotation vN (spec 2026-11-23): tick the lines you'd like cheaper, say what you'd pay and why.
 * Fixed fees are listed, greyed, and can't be ticked. Sending changes no price: the version stays open to
 * accept while the logistics manager answers with a new version or their best price.
 */
export const NegotiateModal: FC<{
  quotation: CustomerQuotation;
  open: boolean;
  onClose: () => void;
}> = ({ quotation, open, onClose }) => {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const send = useSendCounterOffer(quotation.request.id);
  const allLines: CustomerQuoteLine[] = quotation.groups.flatMap((g) => g.lines);
  const lines: NegotiableLine[] = useMemo(
    () =>
      allLines.map((l) => ({
        lineKey: l.lineKey,
        amount: l.amount ?? 0,
        negotiable: l.negotiable,
      })),
    [allLines],
  );
  const schema = useMemo(() => makeNegotiateSchema(lines), [lines]);
  const methods = useFormCustom<NegotiateValues>({
    resolver: zodResolver(schema) as unknown as Resolver<NegotiateValues>,
    defaultValues: { message: '', asks: {} },
  });
  const asks = useWatch({ control: methods.control, name: 'asks' });

  const close = () => {
    send.reset();
    methods.reset();
    onClose();
  };

  const onSubmit = methods.handleSubmit((v) =>
    send.mutate(toCounterOfferBody(v, quotation.versionNo), {
      onSuccess: () => {
        message.success('Counter-offer sent');
        close();
      },
      // Refused because things moved on (sent in another tab, a new version issued): reload the page.
      onError: (error) => {
        if ((error as AxiosError).response?.status !== 409) return;
        void qc.invalidateQueries({ queryKey: queryKeys.requests.one(quotation.request.id) });
      },
    }),
  );

  return (
    <BaseModal
      open={open}
      onCancel={close}
      title={`Negotiate quotation v${quotation.versionNo}`}
      width={720}
    >
      <Flex vertical gap={16}>
        <p className="type-body-m m-0 text-ink-2">
          {`Tick the lines you'd like cheaper and say what you'd pay. Version ${quotation.versionNo} stays open while we answer.`}
        </p>
        <FormWrapper
          methods={methods}
          isSubmitting={send.isPending}
          mode="edit"
          onCancel={close}
          onFinish={onSubmit}
          layout="vertical"
          force
        >
          {({ FormField }) => (
            <>
              <Flex vertical>
                {allLines.map((l) => {
                  const amount = l.amount == null ? '—' : money(l.amount, quotation.currency);
                  if (!l.negotiable)
                    return (
                      <Flex
                        key={l.lineKey}
                        align="center"
                        justify="space-between"
                        gap={12}
                        className="border-t border-line py-2.5"
                      >
                        <Flex align="center" gap={8} className="min-w-0">
                          <span className="type-body-s text-ink-3">{l.description}</span>
                          <Chip dot={false}>At cost</Chip>
                        </Flex>
                        <span className="type-data text-ink-3">{amount}</span>
                      </Flex>
                    );
                  const ticked = asks?.[l.lineKey]?.ticked === true;
                  return (
                    <div key={l.lineKey} className="border-t border-line py-2.5">
                      <Flex align="center" justify="space-between" gap={12}>
                        <Tick lineKey={l.lineKey} label={l.description} />
                        <span className="type-data text-ink">{amount}</span>
                      </Flex>
                      {ticked && (
                        <Flex gap={12} className="pt-2">
                          <FormField
                            name={`asks.${l.lineKey}.price`}
                            label="Your price"
                            component="number"
                            componentProps={{ isRequired: true, min: 0, precision: 2, step: 1 }}
                          />
                          <FormField
                            name={`asks.${l.lineKey}.reason`}
                            label="Why"
                            component="text"
                            componentProps={{ isRequired: true, maxLength: 300 }}
                          />
                        </Flex>
                      )}
                    </div>
                  );
                })}
              </Flex>
              <AsksError />
              <FormField
                name="message"
                label="Message (optional)"
                component="textarea"
                componentProps={{ rows: 2, maxLength: 500 }}
              />
              {send.isError && (
                <Callout tone="bad" title="The counter-offer can’t be sent">
                  {apiErrorMessage(send.error, 'Something went wrong. Try again.')}
                </Callout>
              )}
              <Flex justify="end" gap={8}>
                <CancelButton label="Not now" />
                <SubmitButton type="primary" label="Send counter-offer" />
              </Flex>
            </>
          )}
        </FormWrapper>
      </Flex>
    </BaseModal>
  );
};
