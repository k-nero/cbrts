import { FC } from 'react';
import { Empty, Flex } from 'antd';

/** A page that is designed in Figma but not built yet. */
const PlaceholderPage: FC<{ title: string }> = ({ title }) => (
  <Flex vertical gap={28}>
    <h1 className="m-0 font-display text-[44px] leading-[50px] font-normal text-ink">{title}</h1>
    <Empty description="Designed in Figma; not built yet." />
  </Flex>
);

export default PlaceholderPage;
