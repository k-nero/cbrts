import { FieldPath, FieldValues } from 'react-hook-form';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';

import { CommonFormItemProps } from './FormItem.type';

export type DatePickerFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = Omit<React.ComponentProps<typeof DatePicker>, 'value' | 'defaultValue' | 'suffixIcon'> &
  CommonFormItemProps & {
    name: TName;
    valueFormat?: string;
    defaultValue?: dayjs.Dayjs;
    readOnly?: boolean;
  };
