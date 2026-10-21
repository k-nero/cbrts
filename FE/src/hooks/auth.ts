import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authApi } from '@/apis/auth';
import { queryKeys } from '@/constant/query';
import type { User } from '@/interfaces';
import { selectAccessToken, useAuthStore } from '@/stores/authStore';
import { RegisterRequest } from '@/interfaces/auth.ts';

/**
 * Loads the current user via `/me` and caches it in React Query. Skips the
 * fetch entirely when there is no access token. Mirrors the value into the
 * auth store for places that still read `me` from there.
 */
export function useMe() {
  const accessToken = useAuthStore(selectAccessToken);
  const setMe = useAuthStore((s) => s.setMe);
  // setMe is a stable store action used only to mirror the fetched user as a
  // side effect; it is intentionally not part of the query key.

  return useQuery<User>({
    queryKey: [queryKeys.me()],
    queryFn: async () => {
      const me = await authApi.me();
      setMe(me);
      return me;
    },
    enabled: accessToken !== null,
    staleTime: 5 * 60_000,
  });
}

/** Sign in, storing the session; callers navigate on success. */
export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: (tokens) => setSession(tokens),
  });
}

/** Create a club account; the new account is signed in straight away. */
export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (body: RegisterRequest) => authApi.register(body),
    onSuccess: (tokens) => setSession(tokens),
  });
}

/** Session actions shared by the header, the staff menu and the error boundary. */
export function useAuth() {
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((s) => s.logout);
  const logout = useCallback(() => {
    clearSession();
    queryClient.clear();
    window.location.assign('/login');
  }, [clearSession, queryClient]);
  return { logout };
}
