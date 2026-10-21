import { FC } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useLocation } from 'react-router-dom';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { Button, Result } from 'antd';
import { isAxiosError } from 'axios';

import { NotFoundFallback } from './NotFoundFallback';

import environment from '@/config/environment';
import { useAuth } from '@/hooks/auth';
import { useCustomRouter } from '@/router/route.hook';

const ErrorBoundaryHandling: FC<{ children: React.ReactNode; isAuthenticated?: boolean }> = ({
  children,
  isAuthenticated = true,
}) => {
  const { logout } = useAuth();
  const router = useCustomRouter();
  const { pathname } = useLocation();

  const handleError = (error: unknown) => {
    console.error('ErrorBoundary caught an error:', error);

    if (isAxiosError(error)) {
      console.error('Axios Error Details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
      });
    }
  };

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onError={handleError}
          onReset={reset}
          // Once latched, the fallback replaces the whole route tree and never
          // recovers on navigation. Reset on route change so a transient error
          // (e.g. a 404 mid-delete) can't strand the user.
          resetKeys={[pathname]}
          fallbackRender={({ resetErrorBoundary, error }) => {
            // No response at all: the device is offline (or the server is unreachable).
            if (isAxiosError(error) && !error.response) {
              return (
                <Result
                  status="warning"
                  title={navigator.onLine ? 'Can’t reach the server' : 'You’re offline'}
                  subTitle={
                    navigator.onLine
                      ? 'The server didn’t answer. Check your connection, then try again.'
                      : 'This page loads as soon as the connection is back.'
                  }
                  extra={
                    <Button type="primary" onClick={() => resetErrorBoundary()}>
                      Try again
                    </Button>
                  }
                />
              );
            }

            // 401: the session is gone
            if (isAxiosError(error) && error.response?.status === 401 && isAuthenticated) {
              logout();
              return null;
            }

            if (isAxiosError(error) && error.response?.status === 403) {
              return (
                <Result
                  status="403"
                  title="403"
                  subTitle="You don’t have access to this page."
                  extra={
                    <Button
                      type="primary"
                      onClick={() => {
                        resetErrorBoundary();
                        router.back({ force: true });
                      }}
                    >
                      Go back
                    </Button>
                  }
                />
              );
            }

            // 404
            if (isAxiosError(error) && error.response?.status === 404) {
              return <NotFoundFallback resetErrorBoundary={resetErrorBoundary} />;
            }

            if (isAxiosError(error) && error.response?.status && error.response.status >= 500) {
              return (
                <Result
                  status="500"
                  title="500"
                  subTitle="Something went wrong on our side."
                  extra={
                    <Button type="primary" onClick={() => resetErrorBoundary()}>
                      Try again
                    </Button>
                  }
                />
              );
            }

            return (
              <Result
                status="error"
                title="Something went wrong"
                subTitle={
                  environment.NODE_ENV === 'development' && error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred.'
                }
                extra={[
                  <Button type="primary" key="retry" onClick={() => resetErrorBoundary()}>
                    Try again
                  </Button>,
                  <Button
                    key="back"
                    onClick={() => {
                      resetErrorBoundary();
                      router.back({ force: true });
                    }}
                  >
                    Go back
                  </Button>,
                ]}
              />
            );
          }}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};

export default ErrorBoundaryHandling;
