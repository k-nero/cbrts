import { FC } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useLocation } from 'react-router-dom';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { ErrorFallback } from './ErrorFallback';

/** Logs what failed, for the console and for a bug report. */
export const logBoundaryError = (error: unknown) => {
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

/** The content area's boundary: a page that fails to load or crashes shows ErrorFallback in place. */
const ErrorBoundaryHandling: FC<{ children: React.ReactNode; isAuthenticated?: boolean }> = ({
  children,
  isAuthenticated = true,
}) => {
  const { pathname } = useLocation();

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onError={logBoundaryError}
          onReset={reset}
          // Once latched, the fallback replaces the whole route tree and never
          // recovers on navigation. Reset on route change so a transient error
          // (e.g. a 404 mid-delete) can't strand the user.
          resetKeys={[pathname]}
          fallbackRender={({ resetErrorBoundary, error }) => (
            <ErrorFallback
              error={error}
              reset={resetErrorBoundary}
              isAuthenticated={isAuthenticated}
            />
          )}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};

export default ErrorBoundaryHandling;
