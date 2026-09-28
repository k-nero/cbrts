import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import LoadingPage from '@/components/LoadingPage';
import { useCustomRouter } from '@/router/route.hook';
import { primaryRoleHome, useAuthStore } from '@/stores/authStore';

/**
 * Config-driven access check for the current path (router/route.config.ts): every matched route
 * must allow the session state (authenticated, unauthenticated or public) and one of the user's
 * roles. A signed-out user goes to sign-in; a signed-in user on a page they can't open goes home,
 * or to /forbidden when that is where they already are.
 */
export const RoutesGuardWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useCustomRouter();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => !!state.tokens?.accessToken);
  const roles = useAuthStore((state) => state.roles);
  const authStatus = isAuthenticated ? 'authenticated' : 'unauthenticated';

  const isAllowedToPass = useMemo(
    () =>
      router.configsMatchPath.every((config) => {
        const validAuthType =
          !config.type || config.type === 'public' || config.type === authStatus;
        const validRole =
          config.roles.includes('*') || config.roles.some((r) => (roles as string[]).includes(r));
        return validAuthType && validRole;
      }),
    [authStatus, roles, router.configsMatchPath],
  );

  const redirectPath = useMemo(() => {
    if (!isAuthenticated) return router.paths.get('login');
    return primaryRoleHome(roles);
  }, [isAuthenticated, roles, router.paths]);

  useEffect(() => {
    if (!isAllowedToPass && location.pathname !== redirectPath) {
      router.replace(redirectPath, {
        force: true,
        state: isAuthenticated ? undefined : { from: location },
      });
    }
  }, [isAllowedToPass, isAuthenticated, location, redirectPath, router]);

  if (!isAllowedToPass) return <LoadingPage fullscreen />;

  return <>{children}</>;
};
