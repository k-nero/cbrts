import { FC } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { App as AntdApp, ConfigProvider } from 'antd';

import { queryClient } from '@/config/reactQuery';
import { themeAntd } from '@/config/themeConfig';
import { useThemeStore } from '@/stores/themeStore';

/** Runtime bootstrap: React Query, the AntD theme and AntD's App context (message, modal). */
const ConfigWrapper: FC<{ children: React.ReactNode }> = ({ children }) => {
  const mode = useThemeStore((state) => state.mode);
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={themeAntd[mode]}>
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
      {import.meta.env.DEV ? (
        <ReactQueryDevtools buttonPosition="bottom-right" theme={mode} />
      ) : null}
    </QueryClientProvider>
  );
};

export default ConfigWrapper;
