import { FC } from 'react';
import { EditOutlined } from '@ant-design/icons';
import { AntdIconProps } from '@ant-design/icons/lib/components/AntdIcon';
import { Button, ButtonProps } from 'antd';

type Props = ButtonProps & {
  iconProps?: AntdIconProps;
};

const EditButton: FC<Props> = ({ iconProps, ...buttonProps }) => {
  return (
    <Button {...buttonProps}>
      <EditOutlined {...iconProps} />
    </Button>
  );
};

export default EditButton;
