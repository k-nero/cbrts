import { ReactNode } from 'react';
import { FieldValues } from 'react-hook-form';

import AsyncCreatableSelectField from './fields/AsyncCreatableSelectField';
import AsyncSelectField from './fields/AsyncSelectField';
import CheckboxField from './fields/CheckboxField';
import CheckboxGroupField from './fields/CheckboxGroupField';
import CreatableSelectField from './fields/CreatableSelectField';
import DatePickerField from './fields/DatePickerField';
import FileField from './fields/FileField';
import NumberField from './fields/NumberField';
import OTPField from './fields/OTPField';
import PasswordField from './fields/PasswordField';
import SelectField from './fields/SelectField';
import SwitchField from './fields/SwitchField';
import TextareaField from './fields/TextareaField';
import TextField from './fields/TextField';
import { FormFieldProps } from './types';

const FormField = <T extends FieldValues>({
  name,
  label,
  component,
  componentProps,
}: FormFieldProps<T>): ReactNode => {
  switch (component) {
    case 'text':
      return <TextField name={name} label={label} {...componentProps} />;
    case 'number':
      return <NumberField name={name} label={label} {...componentProps} />;
    case 'password':
      return <PasswordField name={name} label={label} {...componentProps} />;
    case 'textarea':
      return <TextareaField name={name} label={label} {...componentProps} />;
    case 'otp':
      return <OTPField name={name} label={label} {...componentProps} />;
    case 'datepicker':
      return <DatePickerField name={name} label={label} {...componentProps} />;
    case 'select':
      return <SelectField name={name} label={label} {...componentProps} />;
    case 'checkbox':
      return <CheckboxField name={name} label={label} {...componentProps} />;
    case 'checkbox-group':
      return <CheckboxGroupField name={name} label={label} {...componentProps} />;
    case 'switch':
      return <SwitchField name={name} label={label} {...componentProps} />;
    case 'async-select':
      return <AsyncSelectField name={name} label={label} {...componentProps} />;
    case 'async-creatable-select':
      return <AsyncCreatableSelectField name={name} label={label} {...componentProps} />;
    case 'creatable-select':
      return <CreatableSelectField name={name} label={label} {...componentProps} />;
    case 'file':
      return <FileField name={name} label={label} {...componentProps} />;
    default:
      return null;
  }
};

export default FormField;
