import { FC } from 'react';
import { DeleteOutlined } from '@ant-design/icons';
import { AntdIconProps } from '@ant-design/icons/lib/components/AntdIcon';
import { Button, ButtonProps } from 'antd';

type Props = Omit<ButtonProps, 'children'> & {
  iconProps?: AntdIconProps;
};

const DeleteButton: FC<Props> = ({ iconProps, className, ...buttonProps }) => {
  return (
    <Button
      {...buttonProps}
      className={`red-button ${className ?? ''}`}
      data-label="delete-button"
      aria-label="delete-button"
    >
      <DeleteOutlined {...iconProps} />
    </Button>
  );
};

export default DeleteButton;
