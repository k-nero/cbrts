import { FieldValues } from 'react-hook-form';
import { InputNumber } from 'antd';

import { NumberFieldProps } from '../types';
import FormItem from './FormItem';
import ReadOnlyFieldDisplay from './ReadOnlyFieldDisplay';

const NumberField = <TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  isRequired,
  direction,
  labelMinWidth,
  labelPosition,
  styleLabel,
  showLabel,
  disabled,
  instruction,
  questionMark,
  onChange: onCustomChange,
  onBlur: onCustomBlur,
  readOnly,
  ...props
}: NumberFieldProps<TFieldValues>) => {
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
      render={({ field: { onChange, onBlur, ...field }, inputId }) => {
        if (readOnly) {
          return (
            <ReadOnlyFieldDisplay
              value={field.value}
              disabled={disabled}
              minHeight="40px"
              showTooltip={true}
            />
          );
        }
        return (
          <InputNumber
            id={inputId}
            disabled={disabled}
            {...props}
            {...field}
            onChange={(value) => {
              onChange(value);
              onCustomChange?.(value);
            }}
            onBlur={(e) => {
              onBlur();
              onCustomBlur?.(e);
            }}
          />
        );
      }}
    />
  );
};

export default NumberField;
