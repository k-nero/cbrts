import { type FC, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { ruleFormValues, scopeLabel, toRuleRequest } from './constants';
import { RuleFields } from './RuleFields';
import { type AddRuleForm, addRuleSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { useAddRegulationRule, useDocumentTypes } from '@/hooks/regulation';
import type { RegulationVersion } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

type Props = {
  open: boolean;
  draft: RegulationVersion;
  onClose: () => void;
};

/** Add a rule to the draft for a document type it doesn't rule yet (one rule per document type). */
export const AddRuleModal: FC<Props> = ({ open, draft, onClose }) => {
  const { message } = App.useApp();
  const add = useAddRegulationRule();
  const documentTypes = useDocumentTypes();
  const methods = useFormCustom<AddRuleForm>({ resolver: zodResolver(addRuleSchema) });

  const options = useMemo(() => {
    const ruled = new Set(draft.rules.map((r) => r.documentType?.id));
    return (documentTypes.data ?? [])
      .filter((t) => !ruled.has(t.id))
      .map((t) => ({ label: `${t.name} · ${scopeLabel(t.scope).toLowerCase()}`, value: t.id }));
  }, [documentTypes.data, draft.rules]);

  useEffect(() => {
    if (open) methods.reset({ ...ruleFormValues(), documentType: null });
  }, [methods, open]);

  const onSubmit = methods.handleSubmit(async (v) => {
    try {
      await add.mutateAsync({
        versionId: draft.id,
        data: { ...toRuleRequest(v), documentTypeId: v.documentType!.value },
      });
      message.success(`Rule added to draft v${draft.versionNo}`);
      onClose();
    } catch (error) {
      methods.setError('form_error', {
        message: apiErrorMessage(error, "The rule wasn't added. Try again."),
      });
    }
  });

  return (
    <BaseModal open={open} onCancel={onClose} title={`Add rule · draft v${draft.versionNo}`}>
      <FormWrapper
        methods={methods}
        isSubmitting={add.isPending}
        mode="add"
        onCancel={onClose}
        onFinish={onSubmit}
        layout="vertical"
      >
        {({ FormField }) => (
          <>
            <FormField
              name="documentType"
              label="Document"
              component="select"
              componentProps={{
                isRequired: true,
                options,
                isLoading: documentTypes.isLoading,
                placeholder: 'Choose a document',
                noOptionsMessage: () => 'Every document already has a rule in this draft.',
              }}
            />
            <RuleFields />
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton type="primary" label="Add to draft" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};
