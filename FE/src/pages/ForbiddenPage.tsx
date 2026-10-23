import { type Location, useLocation } from 'react-router-dom';

import { ErrorPage } from '@/components/ErrorPage';
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/auth';
import { useCustomRouter } from '@/router/route.hook';
import { primaryRole, primaryRoleHome, useAuthStore } from '@/stores/authStore';

/**
 * /forbidden. The route guard sends a signed-in user here when their role can't open a page (with
 * the page in `state.from`), and primaryRoleHome sends an account with no role the app knows. It
 * says which, and gives the way out: back to their work, or sign out. A signed-out visitor is
 * pointed to sign in.
 */
const ForbiddenPage = () => {
  const router = useCustomRouter();
  const { logout } = useAuth();
  const roles = useAuthStore((state) => state.roles);
  const me = useAuthStore((state) => state.me);
  const signedIn = useAuthStore((state) => !!state.tokens?.accessToken);
  const from = (useLocation().state as { from?: Location } | null)?.from?.pathname;

  const page = !signedIn ? (
    <ErrorPage
      icon="lock"
      title="Sign in to continue"
      actions={
        <Button variant="primary" onClick={() => router.push(router.paths.get('login'))}>
          Sign in
        </Button>
      }
    >
      This part of EquiFreight is for signed-in accounts.
    </ErrorPage>
  ) : primaryRole(roles) === null ? (
    <ErrorPage
      tone="warn"
      icon="lock"
      title="Your account isn’t set up yet"
      actions={
        <Button variant="secondary" leadingIcon="arrow-left" onClick={logout}>
          Sign out
        </Button>
      }
    >
      {me ? `You’re signed in as ${me.email}, but this` : 'This'} account has no role in EquiFreight
      yet, so there’s nothing it can open. A staff role is given by the logistics manager; ask them
      to set yours, then sign in again.
    </ErrorPage>
  ) : (
    <ErrorPage
      icon="lock"
      title="You don’t have permission to view this page"
      actions={
        <Button
          variant="ghost"
          leadingIcon="arrow-left"
          onClick={() => router.push(primaryRoleHome(roles))}
        >
          Back to your work
        </Button>
      }
    >
      {from ? (
        <>
          <span className="font-mono">{from}</span> is kept for another role, so it can’t be opened
          from your account. If you were sent a link to it, ask the person who sent it what they
          need from you.
        </>
      ) : (
        'It’s kept for another role, so it can’t be opened from your account.'
      )}
    </ErrorPage>
  );

  // Outside the app shell, so the page fills the screen on the canvas.
  return <div className="min-h-screen bg-canvas">{page}</div>;
};

export default ForbiddenPage;
