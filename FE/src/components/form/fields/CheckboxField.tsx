import { FieldValues } from 'react-hook-form';
import { Checkbox } from 'antd';

import { CheckboxFieldProps } from '../types';
import FormItem from './FormItem';

import { COLOR_BG_INPUT, COLOR_BORDER_STRONG, COLOR_CONTROL_ON } from '@/constant/color';

const CheckboxField = <TFieldValues extends FieldValues = FieldValues>({
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
  onBlur: onCustomBlur,
  instruction,
  readOnly = false,
  ...props
}: CheckboxFieldProps<TFieldValues>) => {
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
      render={({ field: { onChange, onBlur, value, ...field } }) => {
        if (readOnly) {
          return (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: '22px',
                padding: '0 2px',
              }}
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  border: `1px solid ${COLOR_BORDER_STRONG}`,
                  borderRadius: '2px',
                  backgroundColor: value ? COLOR_CONTROL_ON : COLOR_BG_INPUT,
                  position: 'relative',
                  cursor: 'default',
                }}
              >
                {value && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '1px',
                      left: '4px',
                      width: '6px',
                      height: '10px',
                      border: 'solid white',
                      borderWidth: '0 2px 2px 0',
                      transform: 'rotate(45deg)',
                    }}
                  />
                )}
              </div>
            </div>
          );
        }
        return (
          <Checkbox
            disabled={disabled}
            {...props}
            {...field}
            checked={value}
            onChange={(e) => {
              onChange(e.target.checked);
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

export default CheckboxField;
