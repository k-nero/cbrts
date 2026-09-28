import { FC } from 'react';
import { Empty, Flex } from 'antd';

import PageHeader from '@/components/PageHeader';

/** A page that is designed in Figma but not built yet. */
const PlaceholderPage: FC<{ title: string }> = ({ title }) => (
  <Flex vertical gap={28}>
    <PageHeader title={title} />
    <Empty description="Designed in Figma; not built yet." />
  </Flex>
);

export default PlaceholderPage;
