import type { User } from '../types';
import client from './client';

export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
}

export const authApi = {
    login: (email: string, password: string): Promise<TokenResponse> =>
        client.post<TokenResponse>('/auth/login', { email, password }).then((r) => r.data),
    refresh: (refreshToken: string): Promise<TokenResponse> =>
        client.post<TokenResponse>('/auth/refresh', { refreshToken }).then((r) => r.data),
    logout: (refreshToken: string): Promise<void> =>
        client.post('/auth/logout', { refreshToken }).then(() => undefined),
    me: (): Promise<User> => client.get<User>('/me').then((r) => r.data),
};
