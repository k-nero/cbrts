import type { FC } from 'react';
import { isRouteErrorResponse } from 'react-router-dom';
import { type AxiosError, isAxiosError } from 'axios';

import { ErrorPage } from './ErrorPage';
import { NotFoundFallback } from './NotFoundFallback';

import { Button } from '@/components/ui';
import environment from '@/config/environment';
import { useAuth } from '@/hooks/auth';
import { useCustomRouter } from '@/router/route.hook';
import { primaryRoleHome, useAuthStore } from '@/stores/authStore';

/** "Error 503 · GET /staff/jobs": what to quote when reporting it. */
const requestReference = (error: AxiosError, label: string) => {
  const method = error.config?.method?.toUpperCase();
  const url = error.config?.url;
  return [label, method && url ? `${method} ${url}` : null].filter(Boolean).join(' · ');
};

type Props = {
  error: unknown;
  /** Clears the error and shows the page again (the boundary's reset, or a reload). */
  reset: () => void;
  isAuthenticated?: boolean;
  /**
   * Shown by the router in place of the whole screen: `reset` reloads, so the ways out navigate
   * without it (navigating clears the router's error).
   */
  fullPage?: boolean;
};

/**
 * The page for an error that stopped a page from showing: offline, unreachable, 401 (signs out),
 * 403, 404, a server error, or a crash in the page. Shared by the content boundary
 * (ErrorBoundaryHandling) and the router's errorElement (RouteErrorPage).
 */
export const ErrorFallback: FC<Props> = ({ error, reset, isAuthenticated = true, fullPage }) => {
  const { logout } = useAuth();
  const router = useCustomRouter();
  const roles = useAuthStore((state) => state.roles);
  // Clears the boundary before leaving; the router clears its own error when it navigates.
  const clearBeforeLeaving = fullPage ? () => {} : reset;

  const isUserAuthenticated = isAuthenticated && roles.length > 0;
  const backToWork = isUserAuthenticated ? (
    <Button
      variant="ghost"
      leadingIcon="arrow-left"
      onClick={() => {
        clearBeforeLeaving();
        router.push(primaryRoleHome(roles));
      }}
    >
      Back to your work
    </Button>
  ) : (
    <Button
      variant="ghost"
      onClick={() => {
        clearBeforeLeaving();
        router.push('/signin');
      }}
    >
      Sign in
    </Button>
  );
  const tryAgain = (
    <Button variant="primary" onClick={reset}>
      Try again
    </Button>
  );

  // No response at all: the device is offline (or the server is unreachable).
  if (isAxiosError(error) && !error.response) {
    return navigator.onLine ? (
      <ErrorPage
        tone="warn"
        icon="alert"
        reference={requestReference(error, 'No answer')}
        title="EquiFreight isn’t answering"
        actions={
          <>
            {tryAgain}
            {backToWork}
          </>
        }
      >
        The server didn’t reply. Check your connection, then try again.
      </ErrorPage>
    ) : (
      <ErrorPage tone="warn" icon="alert" title="You’re offline" actions={tryAgain}>
        This page loads as soon as the connection is back. Try again once you’re online.
      </ErrorPage>
    );
  }

  // 401: the session is gone
  if (isAxiosError(error) && error.response?.status === 401 && isAuthenticated) {
    logout();
    return null;
  }

  if (isAxiosError(error) && error.response?.status === 403) {
    return (
      <ErrorPage
        icon="lock"
        reference={requestReference(error, 'Error 403')}
        title="This page isn’t open to you"
        actions={backToWork}
      >
        It belongs to another account or role. If you were sent a link to it, ask the person who
        sent it what they need from you.
      </ErrorPage>
    );
  }

  if (
    (isAxiosError(error) && error.response?.status === 404) ||
    (isRouteErrorResponse(error) && error.status === 404)
  ) {
    return <NotFoundFallback resetErrorBoundary={clearBeforeLeaving} />;
  }

  if (isAxiosError(error) && error.response?.status && error.response.status >= 500) {
    return (
      <ErrorPage
        tone="bad"
        icon="alert"
        reference={requestReference(error, `Error ${error.response.status}`)}
        title="Something went wrong on our side"
        actions={
          <>
            {tryAgain}
            {backToWork}
          </>
        }
      >
        Nothing you did caused this. Try again in a moment; if it keeps happening, give the
        reference above when you ask for help.
      </ErrorPage>
    );
  }

  return (
    <ErrorPage
      tone="bad"
      icon="alert"
      title="This page stopped working"
      detail={
        environment.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      }
      actions={
        <>
          {tryAgain}
          {backToWork}
        </>
      }
    >
      Something in the page broke while showing it. Try again; if it happens again, the rest of your
      work is still reachable from the menu.
    </ErrorPage>
  );
};
