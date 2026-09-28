import { FieldPath, FieldValues } from 'react-hook-form';
import { InputNumberProps, InputProps } from 'antd';
import { PasswordProps, TextAreaProps } from 'antd/es/input';
import { OTPProps } from 'antd/es/input/OTP';

import { CommonFormItemProps } from './FormItem.type';

type BaseInputField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  ComponentProps extends object,
> = ComponentProps &
  CommonFormItemProps & {
    name: TName;
  };

export type TextFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = BaseInputField<TFieldValues, TName, Omit<InputProps, 'type' | 'children'>>;

export type PasswordFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = BaseInputField<TFieldValues, TName, Omit<PasswordProps, 'iconRender' | 'children'>>;

export type OTPFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = BaseInputField<TFieldValues, TName, OTPProps>;

export type NumberFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = BaseInputField<TFieldValues, TName, InputNumberProps> & {
  readOnly?: boolean;
};

export type TextareaFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = BaseInputField<TFieldValues, TName, TextAreaProps>;
