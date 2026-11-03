import { FieldValues } from 'react-hook-form';
import { Input } from 'antd';

import { OTPFieldProps } from '../types';
import FormItem from './FormItem';

const OTPField = <TFieldValues extends FieldValues = FieldValues>({
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
  ...props
}: OTPFieldProps<TFieldValues>) => {
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
      render={({ field: { onChange, onBlur, ...field }, labelId }) => {
        return (
          <Input.OTP
            aria-labelledby={labelId}
            disabled={disabled}
            {...props}
            {...field}
            onChange={(val) => {
              onChange(val);
              onCustomChange?.(val);
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

export default OTPField;
