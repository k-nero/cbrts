import { FieldValues } from 'react-hook-form';
import { Input } from 'antd';

import { TextFieldProps } from '../types';
import FormItem from './FormItem';
import ReadOnlyFieldDisplay from './ReadOnlyFieldDisplay';

const TextField = <TFieldValues extends FieldValues = FieldValues>({
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
}: TextFieldProps<TFieldValues>) => {
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
      render={({ field: { onChange, onBlur, ...field } }) => {
        if (readOnly) {
          return (
            <ReadOnlyFieldDisplay
              value={field.value}
              disabled={disabled}
              showTooltip
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            />
          );
        }
        return (
          <Input
            disabled={disabled}
            {...props}
            {...field}
            onChange={(e) => {
              onChange(e.target.value);
              onCustomChange?.(e);
            }}
            onBlur={(e) => {
              const trimmedValue = e.target.value.trim();
              if (trimmedValue !== field.value) {
                onChange(trimmedValue);
              }
              onBlur();
              onCustomBlur?.(e);
            }}
          />
        );
      }}
    />
  );
};

export default TextField;
