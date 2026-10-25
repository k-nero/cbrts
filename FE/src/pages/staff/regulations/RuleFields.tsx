import type { FC } from 'react';
import { useWatch } from 'react-hook-form';
import { Flex } from 'antd';

import type { RuleFormValues } from './schema';
import { RULE_SHAPE_HELP, RULE_SHAPE_SELECT } from './constants';

import { useFormWrapperCtx } from '@/components/form/FormWrapper';
import { type RegulationRuleKind, RegulationRuleKindEnum } from '@/interfaces';

/**
 * A rule's shape, the days that shape takes, whether it blocks departure, and its note. Shared by the
 * add-rule dialog and the rule editor; it renders inside their `FormWrapper`.
 */
export const RuleFields: FC<{ disabled?: boolean }> = ({ disabled = false }) => {
  const { FormField } = useFormWrapperCtx<RuleFormValues>();
  const shape = useWatch<RuleFormValues, 'ruleKind'>({ name: 'ruleKind' });
  const kind = (shape?.value ??
    RegulationRuleKindEnum.WINDOW_BEFORE_DEPARTURE) as RegulationRuleKind;

  return (
    <>
      <FormField
        name="ruleKind"
        label="Rule shape"
        component="select"
        componentProps={{
          isRequired: true,
          options: RULE_SHAPE_SELECT,
          isDisabled: disabled,
          instruction: RULE_SHAPE_HELP[kind],
        }}
      />
      {kind === RegulationRuleKindEnum.BOOSTER_WINDOW && (
        <Flex gap={16}>
          <FormField
            name="minDays"
            label="At least, days before departure"
            component="number"
            componentProps={{ min: 0, disabled, placeholder: '7' }}
          />
          <FormField
            name="maxDays"
            label="At most, days before departure"
            component="number"
            componentProps={{ isRequired: true, min: 1, disabled, placeholder: '180' }}
          />
        </Flex>
      )}
      {(kind === RegulationRuleKindEnum.WINDOW_BEFORE_DEPARTURE ||
        kind === RegulationRuleKindEnum.VALID_THROUGH_ARRIVAL_PLUS) && (
        <FormField
          name="maxDays"
          label={
            kind === RegulationRuleKindEnum.WINDOW_BEFORE_DEPARTURE
              ? 'Days before departure'
              : 'Days after arrival'
          }
          component="number"
          componentProps={{
            isRequired: true,
            min: kind === RegulationRuleKindEnum.WINDOW_BEFORE_DEPARTURE ? 1 : 0,
            disabled,
            placeholder: kind === RegulationRuleKindEnum.WINDOW_BEFORE_DEPARTURE ? '60' : '2',
          }}
        />
      )}
      <FormField
        name="mandatory"
        component="checkbox"
        componentProps={{ children: 'Blocks departure when not GREEN', disabled }}
      />
      <FormField
        name="description"
        label="Note for the checklist"
        component="textarea"
        componentProps={{
          rows: 2,
          maxLength: 500,
          disabled,
          placeholder: 'Source of the rule, e.g. GDAHP notice 14/2026',
        }}
      />
    </>
  );
};
