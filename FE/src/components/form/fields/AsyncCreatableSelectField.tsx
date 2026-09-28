import { FieldPath, FieldValues } from 'react-hook-form';
import { GroupBase } from 'react-select';
import AsyncCreatableSelect from 'react-select/async-creatable';

import { AsyncCreatableSelectFieldProps, SelectOption, SelectValueType } from '../types';
import FormItem from './FormItem';
import ReadOnlyFieldDisplay from './ReadOnlyFieldDisplay';

import { themeSelect } from '@/config/themeConfig';

const AsyncCreatableSelectField = <
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
  instruction,
  questionMark,
  isMulti,
  onChange: onCustomChange,
  onBlur: onCustomBlur,
  asyncCreateOption,
  readOnly,
  ...props
}: AsyncCreatableSelectFieldProps<
  TFieldValues,
  FieldPath<TFieldValues>,
  Option,
  IsMulti,
  Group
>) => {
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
      disabled={disabled}
      instruction={instruction}
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
          <AsyncCreatableSelect<SelectOption<SelectValueType, Option>, IsMulti, Group>
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
            theme={themeSelect}
            classNamePrefix="react-select"
            placeholder={'Select'}
            {...props}
          />
        );
      }}
    />
  );
};

export default AsyncCreatableSelectField;
