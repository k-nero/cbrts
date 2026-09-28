import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ConfigProvider, theme } from 'antd';

import { queryClient } from './lib/queryClient';
import { router } from './routes';

/** AntD mapped onto the EquiFreight tokens (DESIGN.md): dark navy, gold for the one forward action. */
const EQUIFREIGHT_THEME = {
    token: {
        colorPrimary: '#C9AA5A',
        colorTextLightSolid: '#0C1520',
        colorSuccess: '#5DC688',
        colorWarning: '#FDB47A',
        colorError: '#EF6B6B',
        colorInfo: '#7FB0E8',
        colorTextBase: '#EDE9E1',
        colorBgBase: '#0C1520',
        colorBgLayout: '#0C1520',
        colorBgContainer: '#111B2C',
        colorBgElevated: '#15223A',
        colorBorder: '#2A4266',
        colorBorderSecondary: '#1C2E44',
        borderRadius: 8,
        borderRadiusLG: 12,
        borderRadiusSM: 4,
        fontFamily: 'Outfit, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        fontSize: 14,
        controlHeight: 40,
        wireframe: false,
    },
    components: {
        Button: { fontWeight: 500, primaryColor: '#0C1520' },
        Table: {
            headerBg: '#09111A',
            headerColor: '#7A8FA3',
            rowHoverBg: '#182538',
        },
        Input: { colorBgContainer: '#0E1826' },
        Select: { colorBgContainer: '#0E1826' },
    },
    algorithm: theme.darkAlgorithm,
} as const;

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <ConfigProvider theme={EQUIFREIGHT_THEME}>
                <RouterProvider router={router} />
            </ConfigProvider>
            {import.meta.env.DEV ? <ReactQueryDevtools buttonPosition="bottom-right" /> : null}
        </QueryClientProvider>
    );
}
