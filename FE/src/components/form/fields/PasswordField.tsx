import { FieldValues } from 'react-hook-form';
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { Input } from 'antd';

import { PasswordFieldProps } from '../types';
import FormItem from './FormItem';

const PasswordField = <TFieldValues extends FieldValues = FieldValues>({
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
}: PasswordFieldProps<TFieldValues>) => {
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
        return (
          <Input.Password
            disabled={disabled}
            {...props}
            {...field}
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
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

export default PasswordField;
