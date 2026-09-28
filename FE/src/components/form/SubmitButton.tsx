import { SyncOutlined } from '@ant-design/icons';
import { Button, ButtonProps } from 'antd';

import { useFormWrapperCtx } from './FormWrapper';

export type SubmitButtonProps = Omit<
  ButtonProps,
  'disabled' | 'children' | 'loading' | 'htmlType'
> & {
  disabled?: boolean;
  label: string;
};

export const SubmitButton: React.FC<SubmitButtonProps> = ({ disabled, label, ...props }) => {
  const { isSubmitting } = useFormWrapperCtx();

  return (
    <Button
      {...props}
      htmlType="submit"
      disabled={disabled}
      loading={isSubmitting && { icon: <SyncOutlined spin /> }}
    >
      {label}
    </Button>
  );
};
