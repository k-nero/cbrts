import { useCallback, useMemo } from 'react';
import { FieldPath, FieldValues } from 'react-hook-form';
import Select, { GroupBase, PropsValue } from 'react-select';

import { SelectFieldProps, SelectOption, SelectValueType } from '../types';
import FormItem from './FormItem';
import ReadOnlyFieldDisplay from './ReadOnlyFieldDisplay';

import { getSelectOptionStyles, themeSelect } from '@/config/themeConfig';

const SelectField = <
  TFieldValues extends FieldValues = FieldValues,
  Option extends Record<string, SelectValueType> = any,
  IsMulti extends boolean = false | true,
  Group extends GroupBase<SelectOption<SelectValueType, Option>> = GroupBase<
    SelectOption<SelectValueType, Option>
  >,
>({
  name,
  label,
  isRequired,
  direction,
  labelMinWidth,
  labelPosition,
  styleLabel,
  showLabel,
  disabled,
  options,
  isMulti,
  instruction,
  questionMark,
  onChange: onCustomChange,
  onBlur: onCustomBlur,
  readOnly,
  ...props
}: SelectFieldProps<TFieldValues, FieldPath<TFieldValues>, Option, IsMulti, Group>) => {
  type Opt = SelectOption<SelectValueType, Option>;
  const optionByValue = useMemo(() => {
    const map = new Map<SelectValueType, Opt>();
    const collect = (list: readonly (Opt | Group)[]) => {
      list.forEach((entry) => {
        const group = entry as Group;
        if (group && Array.isArray(group.options)) {
          collect(group.options);
          return;
        }
        const option = entry as Opt;
        if (option) map.set(option.value, option);
      });
    };
    collect((options ?? []) as readonly (Opt | Group)[]);

    return map;
  }, [options]);

  const resolveValue = useCallback(
    (current: PropsValue<Opt> | null | undefined): PropsValue<Opt> | undefined => {
      const pick = (option: Opt): Opt => optionByValue.get(option.value) ?? option;

      if (Array.isArray(current)) return current.map(pick);
      if (current) return pick(current as Opt);

      return current ?? undefined;
    },
    [optionByValue],
  );
  return (
    <FormItem
      name={name}
      label={label}
      isRequired={isRequired}
      direction={direction}
      labelMinWidth={labelMinWidth}
      labelPosition={labelPosition}
      styleLabel={styleLabel}
      showLabel={showLabel}
      instruction={instruction}
      disabled={disabled}
      questionMark={questionMark}
      render={({ field: { onChange, onBlur, value }, inputId }) => {
        if (readOnly) {
          const getDisplayText = () => {
            if (!value) return '';
            if (isMulti && Array.isArray(value)) {
              return value
                .map((option: SelectOption<SelectValueType, Option>) => option.label)
                .join(', ');
            }
            return (value as SelectOption<SelectValueType, Option>)?.label || '';
          };

          return (
            <ReadOnlyFieldDisplay
              value={getDisplayText()}
              disabled={disabled}
              minHeight="40px"
              showTooltip={true}
            />
          );
        }
        return (
          <Select<SelectOption<SelectValueType, Option>, IsMulti, Group>
            inputId={inputId}
            options={options}
            isMulti={isMulti}
            value={resolveValue(value)}
            onChange={(selected, actionMeta) => {
              onChange(selected);
              onCustomChange?.(selected, actionMeta);
            }}
            onBlur={(e) => {
              onBlur();
              onCustomBlur?.(e);
            }}
            theme={themeSelect}
            isDisabled={disabled}
            classNamePrefix="react-select"
            placeholder="Select"
            {...props}
            styles={{ ...props.styles, ...getSelectOptionStyles() }}
          />
        );
      }}
    />
  );
};

export default SelectField;
