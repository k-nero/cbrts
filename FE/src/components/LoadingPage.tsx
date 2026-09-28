import { FC } from 'react';
import { Flex, Spin } from 'antd';

type Props = {
  fullscreen?: boolean;
};

const LoadingPage: FC<Props> = ({ fullscreen }) => (
  <Flex
    justify="center"
    align="center"
    style={{ height: fullscreen ? '100vh' : '100%', width: fullscreen ? '100vw' : '100%' }}
  >
    <Spin size="large" />
  </Flex>
);

export default LoadingPage;
