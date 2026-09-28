import { FC } from 'react';
import { Button, ButtonProps } from 'antd';

import { useFormWrapperCtx } from './FormWrapper';

export type CancelButtonProps = Omit<ButtonProps, 'disabled' | 'children' | 'htmlType'> & {
  disabled?: boolean;
  label: string;
};

export const CancelButton: FC<CancelButtonProps> = ({ label, disabled, className, ...props }) => {
  const { onCancel } = useFormWrapperCtx();

  if (!onCancel) return null;

  return (
    <Button
      {...props}
      className={`cancel-button ${className ?? ''}`}
      htmlType="button"
      disabled={disabled}
      onClick={onCancel}
    >
      {label}
    </Button>
  );
};
