import { type FC, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { ruleFormValues, scopeLabel, toRuleRequest } from './constants';
import { RuleFields } from './RuleFields';
import { type RuleFormValues, ruleSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import { Callout, Panel } from '@/components/ui';
import { useUpdateRegulationRule } from '@/hooks/regulation';
import type { RegulationRule } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

/** One rule's shape, days and blocking, editable only in a draft; Cancel goes back to its saved values. */
export const RuleForm: FC<{ rule: RegulationRule; editable: boolean }> = ({ rule, editable }) => {
  const { message } = App.useApp();
  const update = useUpdateRegulationRule();
  const methods = useFormCustom<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: ruleFormValues(rule),
  });

  useEffect(() => {
    methods.reset(ruleFormValues(rule));
  }, [methods, rule]);

  const onSubmit = methods.handleSubmit(async (v) => {
    try {
      await update.mutateAsync({ ruleId: rule.id, data: toRuleRequest(v) });
      message.success('Rule saved to the draft');
    } catch (error) {
      methods.setError('form_error', {
        message: apiErrorMessage(error, "The rule wasn't saved. Try again."),
      });
    }
  });

  return (
    <Panel title={`Edit rule · ${rule.documentType?.name ?? 'Document'}`} className="h-full">
      <FormWrapper
        methods={methods}
        isSubmitting={update.isPending}
        mode="edit"
        onCancel={() => methods.reset(ruleFormValues(rule))}
        onFinish={onSubmit}
        layout="vertical"
        force={!editable}
      >
        {!editable && (
          <Callout tone="info" title="This is the published version">
            Published rules don&apos;t change. Create a draft version to edit them.
          </Callout>
        )}
        <RuleFields disabled={!editable} />
        <Flex vertical gap={4}>
          <span className="type-label-s text-ink-3">Applies to</span>
          <span className="type-body-m text-ink">{scopeLabel(rule.documentType?.scope)}</span>
          <span className="type-body-s text-ink-3">
            Set by the document type, for every catalog.
          </span>
        </Flex>
        {editable && (
          <Flex justify="end" gap={8}>
            <CancelButton label="Cancel" />
            <SubmitButton label="Save to draft" />
          </Flex>
        )}
      </FormWrapper>
    </Panel>
  );
};
