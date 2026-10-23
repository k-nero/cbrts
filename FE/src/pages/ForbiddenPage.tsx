import { ErrorPage } from '@/components/ErrorPage';
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/auth';
import { useCustomRouter } from '@/router/route.hook';
import { primaryRole, primaryRoleHome, useAuthStore } from '@/stores/authStore';

/**
 * /forbidden. The route guard sends a signed-in user who can't open a page to their role's home, so
 * this page is reached when the account has no role the app knows (primaryRoleHome's fallback):
 * say so, and offer to sign out. Opened directly, it points a signed-out visitor to sign in and
 * anyone with a role back to their work.
 */
const ForbiddenPage = () => {
  const router = useCustomRouter();
  const { logout } = useAuth();
  const roles = useAuthStore((state) => state.roles);
  const me = useAuthStore((state) => state.me);
  const signedIn = useAuthStore((state) => !!state.tokens?.accessToken);

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
      title="This page isn’t open to you"
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
      It belongs to another account or role.
    </ErrorPage>
  );

  // Outside the app shell, so the page fills the screen on the canvas.
  return <div className="min-h-screen bg-canvas">{page}</div>;
};

export default ForbiddenPage;
