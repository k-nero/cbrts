import { FC } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { App as AntdApp, ConfigProvider } from 'antd';

import { queryClient } from '@/config/reactQuery';
import { themeAntd } from '@/config/themeConfig';

/** Runtime bootstrap: React Query, the AntD theme and AntD's App context (message, modal). */
const ConfigWrapper: FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <ConfigProvider theme={themeAntd}>
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
    {import.meta.env.DEV ? <ReactQueryDevtools buttonPosition="bottom-right" /> : null}
  </QueryClientProvider>
);

export default ConfigWrapper;
