import { useQuery } from '@tanstack/react-query';

import { authApi } from '../api/auth';
import { selectAccessToken, useAuthStore } from '../store/authStore.ts';
import type { User } from '../types';
import { queryKeys } from './keys';

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
