import { FieldPath, FieldValues } from 'react-hook-form';
import { UploadFile, UploadProps } from 'antd';

import { CommonFormItemProps } from './FormItem.type';

export type CustomUploadFile = UploadFile & Record<string, any>;

export type FileFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = Omit<UploadProps, 'showUploadList' | 'beforeUpload'> &
  CommonFormItemProps & {
    name: TName;
    maxSize?: number;

    onDelete?: (remainValues: any[]) => void;
    onUploading?: (status: 'start' | 'success' | 'error') => void;
    supported?: string;
    onValidate?: (file: File) => Promise<boolean | string>;
  };
