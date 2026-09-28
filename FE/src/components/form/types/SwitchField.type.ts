import { FieldPath, FieldValues } from 'react-hook-form';
import { SwitchProps } from 'antd';

import { CommonFormItemProps } from './FormItem.type';

export type SwitchFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = SwitchProps &
  CommonFormItemProps & {
    name: TName;
    readOnly?: boolean;
  };
