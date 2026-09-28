import { FieldPath, FieldValues } from 'react-hook-form';
import { CheckboxGroupProps } from 'antd/es/checkbox';

import { CommonFormItemProps } from './FormItem.type';

export type CheckboxGroupOption = {
  label: string;
  value: string | number;
  disabled?: boolean;
};

export type CheckboxGroupFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = Omit<CheckboxGroupProps, 'onChange' | 'onBlur' | 'value'> &
  CommonFormItemProps & {
    name: TName;
    options: CheckboxGroupOption[];
    readOnly?: boolean;
    onChange?: (checkedValues: (string | number)[]) => void;
    onBlur?: () => void;
  };
