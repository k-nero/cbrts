import { FieldPath, FieldValues } from 'react-hook-form';
import { CheckboxProps } from 'antd';

import { CommonFormItemProps } from './FormItem.type';

export type CheckboxFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = CheckboxProps &
  CommonFormItemProps & {
    name: TName;
    readOnly?: boolean;
  };
