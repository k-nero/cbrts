import { FieldValues } from 'react-hook-form';
import { Input } from 'antd';

import { TextareaFieldProps } from '../types';
import FormItem from './FormItem';
import ReadOnlyFieldDisplay from './ReadOnlyFieldDisplay';

const TextareaField = <TFieldValues extends FieldValues = FieldValues>({
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
}: TextareaFieldProps<TFieldValues>) => {
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
          const minHeight = props.rows ? `${props.rows * 22 + 16}px` : '80px';
          return (
            <ReadOnlyFieldDisplay
              value={field.value}
              disabled={disabled}
              minHeight={minHeight}
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            />
          );
        }
        return (
          <Input.TextArea
            id={inputId}
            disabled={disabled}
            {...props}
            {...field}
            onChange={(e) => {
              onChange(e.target.value);
              onCustomChange?.(e);
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

export default TextareaField;
