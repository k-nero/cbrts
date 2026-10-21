import client from '@/config/axios';
import type { User } from '@/interfaces';
import { RegisterRequest, TokenResponse } from '@/interfaces';

export const authApi = {
  login: (email: string, password: string): Promise<TokenResponse> =>
    client.post<TokenResponse>('/auth/login', { email, password }).then((r) => r.data),
  register: (body: RegisterRequest): Promise<TokenResponse> =>
    client.post<TokenResponse>('/auth/register', body).then((r) => r.data),
  refresh: (refreshToken: string): Promise<TokenResponse> =>
    client.post<TokenResponse>('/auth/refresh', { refreshToken }).then((r) => r.data),
  logout: (refreshToken: string): Promise<void> =>
    client.post('/auth/logout', { refreshToken }).then(() => undefined),
  me: (): Promise<User> => client.get<User>('/me').then((r) => r.data),
};
