import { FieldValues } from 'react-hook-form';

import FormField from './FormField';
import { FormFieldProps } from './types';

export const FormFieldWithType = <T extends FieldValues>(props: FormFieldProps<T>) => {
  return <FormField<T> {...props} />;
};
