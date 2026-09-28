import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import { useAuthStore } from '../store/authStore.ts';

interface InflightConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

interface TokenResponse {
    accessToken: string;
    refreshToken: string;
}

const client = axios.create({
    baseURL: '/api/v1',
    headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<TokenResponse> | null = null;

/**
 * The session is dead (no refresh token, or refresh failed — e.g. both tokens expired after the tab
 * sat idle). Send the user to the login page. A full navigation guarantees it lands there regardless
 * of which route is mounted, and reloads with the cleared session; skipped if already on /login.
 */
function redirectToLogin(): void {
    if (window.location.pathname !== '/login') {
        window.location.assign('/login');
    }
}

client.interceptors.request.use((config) => {
    const tokens = useAuthStore.getState().tokens;
    if (tokens?.accessToken) {
        config.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
    }
    return config;
});

client.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        const original = error.config as InflightConfig | undefined;
        const status = error.response?.status;

        // 401 is the refresh signal, but a stale session can also surface as 403 (Spring answered
        // 403 for anonymous requests on protected routes before the entry-point fix, and older
        // deployments still do). A refresh + single retry is harmless for a genuine role denial —
        // the retry just 403s again and rejects — so treat both as refreshable.
        if (
            (status !== 401 && status !== 403) ||
            !original ||
            original._retry === true ||
            original.url?.startsWith('/auth/') === true
        ) {
            return Promise.reject(error);
        }

        const setSession = useAuthStore.getState().setSession;
        const tokens = useAuthStore.getState().tokens;
        if (!tokens?.refreshToken) {
            setSession(null);
            redirectToLogin();
            return Promise.reject(error);
        }

        try {
            refreshPromise ??= axios
                .post<TokenResponse>(
                    '/api/v1/auth/refresh',
                    { refreshToken: tokens.refreshToken },
                    { headers: { 'Content-Type': 'application/json' } }
                )
                .then((res) => {
                    setSession(res.data);
                    return res.data;
                })
                .finally(() => {
                    refreshPromise = null;
                });
            const newTokens = await refreshPromise;
            original._retry = true;
            original.headers.set('Authorization', `Bearer ${newTokens.accessToken}`);
            return await client(original);
        } catch (refreshErr) {
            setSession(null);
            redirectToLogin();
            return Promise.reject(refreshErr);
        }
    }
);

export default client;
