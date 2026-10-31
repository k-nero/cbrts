import { FieldValues } from 'react-hook-form';
import { Checkbox, Space } from 'antd';

import { CheckboxGroupFieldProps, CheckboxGroupOption } from '../types/CheckboxGroupField.type';
import FormItem from './FormItem';

import { COLOR_TEXT_TERTIARY } from '@/constant/color';

const CheckboxGroupField = <TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  isRequired,
  direction,
  labelMinWidth,
  labelPosition,
  styleLabel,
  showLabel,
  disabled,
  questionMark,
  onChange: onCustomChange,
  instruction,
  readOnly = false,
  options,
  ...props
}: CheckboxGroupFieldProps<TFieldValues>) => {
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
      render={({ field: { onChange, value, ...field }, labelId }) => {
        if (readOnly) {
          const selectedValues = Array.isArray(value) ? value : [];
          return (
            <Space wrap>
              {options
                .filter((option: CheckboxGroupOption) =>
                  selectedValues.includes(option.value as never),
                )
                .map((option: CheckboxGroupOption) => (
                  <span key={option.value} style={{ color: COLOR_TEXT_TERTIARY }}>
                    {option.label}
                  </span>
                ))}
            </Space>
          );
        }

        return (
          <Checkbox.Group
            aria-labelledby={labelId}
            {...props}
            {...field}
            value={value || []}
            options={options}
            disabled={disabled}
            onChange={(checkedValues) => {
              onChange(checkedValues);
              onCustomChange?.(checkedValues as (string | number)[]);
            }}
          />
        );
      }}
    />
  );
};

export default CheckboxGroupField;
