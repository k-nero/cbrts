import { ReactNode } from 'react';
import { FieldPath, FieldValues } from 'react-hook-form';

import { CheckboxFieldProps } from './CheckboxField.type';
import { CheckboxGroupFieldProps } from './CheckboxGroupField.type';
import { DatePickerFieldProps } from './DatePickerField.type';
import { FileFieldProps } from './FileField.type';
import {
  NumberFieldProps,
  OTPFieldProps,
  PasswordFieldProps,
  TextareaFieldProps,
  TextFieldProps,
} from './InputField.type';
import {
  AsyncCreatableSelectFieldProps,
  AsyncSelectFieldProps,
  CreatableSelectFieldProps,
  SelectFieldProps,
} from './SelectField.type';
import { SwitchFieldProps } from './SwitchField.type';

type BaseFieldProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>> = {
  label?: ReactNode;
  name: TName;
};

type TextFormFieldProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>> = {
  component: 'text';
  componentProps?: Omit<TextFieldProps<TFieldValues, TName>, 'name' | 'label'>;
};

type PasswordFormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  component: 'password';
  componentProps?: Omit<PasswordFieldProps<TFieldValues, TName>, 'name' | 'label'>;
};

type NumberFormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  component: 'number';
  componentProps?: Omit<NumberFieldProps<TFieldValues, TName>, 'name' | 'label'>;
};

type OTPFormFieldProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>> = {
  component: 'otp';
  componentProps?: Omit<OTPFieldProps<TFieldValues, TName>, 'name' | 'label'>;
};

type TextAreaFormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  component: 'textarea';
  componentProps?: Omit<TextareaFieldProps<TFieldValues, TName>, 'name' | 'label'>;
};

type DatePickerFormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  component: 'datepicker';
  componentProps?: Omit<DatePickerFieldProps<TFieldValues, TName>, 'name' | 'label'>;
};

type SelectFormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  component: 'select';
  componentProps?: Omit<SelectFieldProps<TFieldValues, TName>, 'name' | 'label'>;
};

type AsyncSelectFormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  component: 'async-select';
  componentProps?: Omit<AsyncSelectFieldProps<TFieldValues, TName>, 'name' | 'label'>;
};

type CreatableSelectFormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  component: 'creatable-select';
  componentProps?: Omit<CreatableSelectFieldProps<TFieldValues, TName>, 'name' | 'label'>;
};

type AsyncCreatableSelectFormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  component: 'async-creatable-select';
  componentProps?: Omit<AsyncCreatableSelectFieldProps<TFieldValues, TName>, 'name' | 'label'>;
};

type CheckboxFormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  component: 'checkbox';
  componentProps?: Omit<CheckboxFieldProps<TFieldValues, TName>, 'name' | 'label'>;
};

type CheckboxGroupFormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  component: 'checkbox-group';
  componentProps: Omit<CheckboxGroupFieldProps<TFieldValues, TName>, 'name' | 'label'>;
};

type SwitchFormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  component: 'switch';
  componentProps?: Omit<SwitchFieldProps<TFieldValues, TName>, 'name' | 'label'>;
};

type FileFormFieldProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>> = {
  component: 'file';
  componentProps?: Omit<FileFieldProps<TFieldValues, TName>, 'name' | 'label'>;
};

export type FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = BaseFieldProps<TFieldValues, TName> &
  (
    | TextFormFieldProps<TFieldValues, TName>
    | PasswordFormFieldProps<TFieldValues, TName>
    | NumberFormFieldProps<TFieldValues, TName>
    | OTPFormFieldProps<TFieldValues, TName>
    | TextAreaFormFieldProps<TFieldValues, TName>
    | DatePickerFormFieldProps<TFieldValues, TName>
    | SelectFormFieldProps<TFieldValues, TName>
    | AsyncSelectFormFieldProps<TFieldValues, TName>
    | CreatableSelectFormFieldProps<TFieldValues, TName>
    | AsyncCreatableSelectFormFieldProps<TFieldValues, TName>
    | CheckboxFormFieldProps<TFieldValues, TName>
    | CheckboxGroupFormFieldProps<TFieldValues, TName>
    | SwitchFormFieldProps<TFieldValues, TName>
    | FileFormFieldProps<TFieldValues, TName>
  );
