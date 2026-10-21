import { FC } from 'react';
import { Button, ButtonProps } from 'antd';

export const ActionButton: FC<ButtonProps> = (props) => {
  return (
    <Button type="link" {...props}>
      {props?.children}
    </Button>
  );
};
