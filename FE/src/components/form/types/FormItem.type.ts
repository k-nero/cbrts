import { CSSProperties, ReactNode } from 'react';
import { ControllerRenderProps, FieldPath, FieldValues, UseFormStateReturn } from 'react-hook-form';
import { FormItemProps as AntdFormItemProps } from 'antd';

export type FormItemProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = Omit<AntdFormItemProps, 'name'> &
  CommonFormItemProps & {
    name: TName;
    render: (props: {
      field: Omit<ControllerRenderProps<TFieldValues, TName>, 'ref'>;
      formState: UseFormStateReturn<TFieldValues>;
      /** The id the field puts on its focusable element, so the label names it. */
      inputId: string;
      /** The label's id, for a field whose control is a group rather than one input. */
      labelId: string;
    }) => ReactNode;
  };

export interface CommonFormItemProps {
  label?: ReactNode;
  isRequired?: boolean;
  direction?: 'vertical' | 'horizontal';
  labelMinWidth?: string;
  labelPosition?: 'before' | 'after';
  styleLabel?: CSSProperties;
  showLabel?: boolean;
  disabled?: boolean;
  instruction?: string;
  questionMark?: string;
}
