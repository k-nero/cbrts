import { useRef } from 'react';
import { FieldPath, FieldValues } from 'react-hook-form';
import { GroupBase, SelectInstance } from 'react-select';
import CreatableSelect from 'react-select/creatable';

import { CreatableSelectFieldProps, SelectOption, SelectValueType } from '../types';
import FormItem from './FormItem';
import ReadOnlyFieldDisplay from './ReadOnlyFieldDisplay';

import { getSelectOptionStyles, themeSelect } from '@/config/themeConfig';

const CreatableSelectField = <
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
  asyncCreateOption,
  readOnly,
  ...props
}: CreatableSelectFieldProps<TFieldValues, FieldPath<TFieldValues>, Option, IsMulti, Group>) => {
  const selectRef = useRef<SelectInstance<
    SelectOption<SelectValueType, Option>,
    IsMulti,
    Group
  > | null>(null);
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
      render={({ field: { onChange, onBlur, value } }) => {
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
          <CreatableSelect<SelectOption<SelectValueType, Option>, IsMulti, Group>
            options={options}
            isMulti={isMulti}
            value={value}
            onChange={(selected, actionMeta) => {
              onChange(selected);
              onCustomChange?.(selected, actionMeta);
            }}
            onBlur={(e) => {
              onBlur();
              onCustomBlur?.(e);
            }}
            onCreateOption={async (inputValue) => {
              if (asyncCreateOption) {
                const newOption = await asyncCreateOption(inputValue);
                if (isMulti) {
                  onChange([...(value || []), newOption]);
                } else {
                  onChange(newOption);
                }
              }
            }}
            isDisabled={disabled}
            classNamePrefix="react-select"
            theme={themeSelect}
            placeholder={'Select'}
            {...props}
            ref={selectRef}
            styles={{ ...props.styles, ...getSelectOptionStyles() }}
            onMenuOpen={() => {
              props.onMenuOpen?.();
              const instance = selectRef.current;
              const selected = (Array.isArray(value) ? value[0] : value) as
                SelectOption<SelectValueType, Option> | undefined;
              if (!instance || !selected) return;

              const focusedOption = instance
                .buildFocusableOptions()
                .find((option) => option.value === selected.value);
              if (!focusedOption) return;

              instance.setState({
                focusedOption,
                focusedOptionId: instance.getFocusedOptionId(focusedOption),
              });
            }}
          />
        );
      }}
    />
  );
};

export default CreatableSelectField;
