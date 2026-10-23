import { Icon } from '@/components/ui';
import { Flex } from 'antd';

export const Lock = () => (
  <Flex
    component="span"
    align="center"
    justify="center"
    className="size-7 shrink-0 rounded-full bg-muted text-ink-2"
  >
    <Icon name="lock" size={14} />
  </Flex>
);
