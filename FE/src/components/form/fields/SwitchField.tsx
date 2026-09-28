import { FieldValues } from 'react-hook-form';
import { Switch } from 'antd';

import { SwitchFieldProps } from '../types';
import FormItem from './FormItem';

import {
  COLOR_BORDER_STRONG,
  COLOR_CONTROL_ON,
  COLOR_SHADOW,
  COLOR_TEXT_PRIMARY,
} from '@/constant/color';

const SwitchField = <TFieldValues extends FieldValues = FieldValues>({
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
  readOnly,
  ...props
}: SwitchFieldProps<TFieldValues>) => {
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
      render={({ field: { onChange, ...field } }) => {
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
                  width: '44px',
                  height: '22px',
                  borderRadius: '11px',
                  backgroundColor: field.value ? COLOR_CONTROL_ON : COLOR_BORDER_STRONG,
                  position: 'relative',
                  transition: 'all 0.2s',
                  cursor: 'default',
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: COLOR_TEXT_PRIMARY,
                    position: 'absolute',
                    top: '2px',
                    left: field.value ? '24px' : '2px',
                    transition: 'all 0.2s',
                    boxShadow: `0 2px 4px ${COLOR_SHADOW}`,
                  }}
                />
              </div>
            </div>
          );
        }
        return (
          <Switch
            disabled={disabled}
            {...props}
            {...field}
            onChange={(checked, event) => {
              onChange(checked);
              onCustomChange?.(checked, event);
            }}
          />
        );
      }}
    />
  );
};

export default SwitchField;
