import { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';

import { logBoundaryError } from './ErrorBoundaryHandling';
import { ErrorFallback } from './ErrorFallback';

/**
 * The router's errorElement: an error thrown outside the content boundary (the shell, the sidebar's
 * counts, a route guard) replaces the whole screen, so it gets the same page, full height, and
 * "Try again" reloads.
 */
const RouteErrorPage = () => {
  const error = useRouteError();
  useEffect(() => logBoundaryError(error), [error]);
  return (
    <div className="min-h-screen bg-canvas">
      <ErrorFallback error={error} reset={() => window.location.reload()} fullPage />
    </div>
  );
};

export default RouteErrorPage;
