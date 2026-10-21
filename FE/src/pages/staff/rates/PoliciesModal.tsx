import { type FC, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type OnDraftGone, refuse } from './editorOptions';
import { POLICY_FIELDS, type PolicyForm, policySchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { usePutPolicies } from '@/hooks/rates';
import type { RateCorridorView } from '@/interfaces';

/** Edit the percentages and policy values; the fee bands stay read-only in this slice. */
export const PoliciesModal: FC<{
  open: boolean;
  view: RateCorridorView;
  onClose: () => void;
  onDraftGone: OnDraftGone;
}> = ({ open, view, onClose, onDraftGone }) => {
  const { message } = App.useApp();
  const put = usePutPolicies();
  const methods = useFormCustom<PolicyForm>({ resolver: zodResolver(policySchema) });

  useEffect(() => {
    if (!open) return;
    methods.reset(
      Object.fromEntries(
        POLICY_FIELDS.map((f) => [f.key, view.policies[f.key] ?? null]),
      ) as PolicyForm,
    );
  }, [methods, open, view]);

  const onSubmit = methods.handleSubmit(async (v) => {
    try {
      await put.mutateAsync({ values: v, view: view.corridor.id });
      message.success('Percentages saved to the draft');
      onClose();
    } catch (error) {
      if (onDraftGone(error)) return onClose();
      const keys = POLICY_FIELDS.map((f) => f.key);
      refuse(error, Object.fromEntries(keys.map((k) => [k, k])), keys, (name, msg, focus) =>
        methods.setError(name as never, { message: msg }, { shouldFocus: focus }),
      );
    }
  });

  return (
    <BaseModal open={open} onCancel={onClose} title="Percentages and policy">
      <FormWrapper
        methods={methods}
        isSubmitting={put.isPending}
        mode="edit"
        onCancel={onClose}
        onFinish={onSubmit}
        layout="vertical"
      >
        {({ FormField }) => (
          <>
            <div className="grid grid-cols-2 gap-x-4">
              {POLICY_FIELDS.map((f) => (
                <FormField
                  key={f.key}
                  name={f.key}
                  label={f.label}
                  component="number"
                  componentProps={{ isRequired: true, min: 0, max: f.max, step: f.step }}
                />
              ))}
            </div>
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton type="primary" label="Save to draft" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};
