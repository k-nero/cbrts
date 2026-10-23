import { Icon } from '@/components/ui';
import { Flex } from 'antd';

export const Fixed = () => (
  <Flex
    component="span"
    align="center"
    justify="center"
    className="size-7 shrink-0 rounded-full bg-ok-soft text-ok"
  >
    <Icon name="check" size={14} />
  </Flex>
);
