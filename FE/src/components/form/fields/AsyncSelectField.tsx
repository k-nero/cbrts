import { FieldPath, FieldValues } from 'react-hook-form';
import { GroupBase } from 'react-select';
import AsyncSelect from 'react-select/async';

import { AsyncSelectFieldProps, SelectOption, SelectValueType } from '../types';
import FormItem from './FormItem';
import ReadOnlyFieldDisplay from './ReadOnlyFieldDisplay';

import { themeSelect } from '@/config/themeConfig';

const AsyncSelectField = <
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
}: AsyncSelectFieldProps<TFieldValues, FieldPath<TFieldValues>, Option, IsMulti, Group>) => {
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
          <AsyncSelect<SelectOption<SelectValueType, Option>, IsMulti, Group>
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
            isDisabled={disabled}
            theme={themeSelect}
            classNamePrefix="react-select"
            placeholder="Select"
            {...props}
          />
        );
      }}
    />
  );
};

export default AsyncSelectField;
