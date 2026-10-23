import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import LoadingPage from '@/components/LoadingPage';
import { useCustomRouter } from '@/router/route.hook';
import { primaryRoleHome, useAuthStore } from '@/stores/authStore';

/**
 * Config-driven access check for the current path (router/route.config.ts): every matched route
 * must allow the session state (authenticated, unauthenticated or public) and one of the user's
 * roles. A signed-out user goes to sign-in. A signed-in user on a signed-out page (sign-in, register)
 * goes home; one whose role can't open the page goes to /forbidden, which says so and names the page.
 */
export const RoutesGuardWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useCustomRouter();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => !!state.tokens?.accessToken);
  const roles = useAuthStore((state) => state.roles);
  const authStatus = isAuthenticated ? 'authenticated' : 'unauthenticated';

  const validAuthType = useMemo(
    () =>
      router.configsMatchPath.every(
        (config) => !config.type || config.type === 'public' || config.type === authStatus,
      ),
    [authStatus, router.configsMatchPath],
  );
  const validRole = useMemo(
    () =>
      router.configsMatchPath.every(
        (config) =>
          config.roles.includes('*') || config.roles.some((r) => (roles as string[]).includes(r)),
      ),
    [roles, router.configsMatchPath],
  );
  const isAllowedToPass = validAuthType && validRole;
  // Signed in, on a page meant for the signed-in, but not for this role.
  const roleDenied = isAuthenticated && validAuthType && !validRole;

  const redirectPath = useMemo(() => {
    if (!isAuthenticated) return router.paths.get('login');
    if (roleDenied) return router.paths.get('forbidden');
    return primaryRoleHome(roles);
  }, [isAuthenticated, roleDenied, roles, router.paths]);

  useEffect(() => {
    if (!isAllowedToPass && location.pathname !== redirectPath) {
      router.replace(redirectPath, {
        force: true,
        // Sign-in returns to the page afterwards; /forbidden names it.
        state: !isAuthenticated || roleDenied ? { from: location } : undefined,
      });
    }
  }, [isAllowedToPass, isAuthenticated, location, redirectPath, roleDenied, router]);

  if (!isAllowedToPass) return <LoadingPage fullscreen />;

  return <>{children}</>;
};
