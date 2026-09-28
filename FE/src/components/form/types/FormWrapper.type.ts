import { FieldValues, UseFormReturn } from 'react-hook-form';
import { FormProps } from 'antd';

import { FormFieldProps } from './FormField.type';

export type ExtraFormProps = {
  isSubmitting: boolean;
  mode?: 'view' | 'edit' | 'add';
  onCancel?: () => void;
};

export interface FormContextType<T extends FieldValues = any> extends ExtraFormProps {
  FormField: React.FC<FormFieldProps<T>>;
}

export type FormWrapperProps<T extends FieldValues = any, V = any> = {
  methods: UseFormReturn<T & { form_error?: unknown }, V>;
  children:
    React.ReactNode | ((props: FormContextType<T & { form_error?: unknown }>) => React.ReactNode);
  force?: boolean;
} & ExtraFormProps &
  Omit<FormProps, 'children'>;
