import { FC } from 'react';

import { ErrorPage } from './ErrorPage';

import { Button } from '@/components/ui';
import { useCustomRouter } from '@/router/route.hook';
import { primaryRoleHome, useAuthStore } from '@/stores/authStore';

/** A 404 from the API: the record is gone, or the link was wrong. */
export const NotFoundFallback: FC<{ resetErrorBoundary: () => void }> = ({
  resetErrorBoundary,
}) => {
  const router = useCustomRouter();
  const roles = useAuthStore((state) => state.roles);
  return (
    <ErrorPage
      icon="file"
      reference="Error 404"
      title="This page doesn’t exist, or the record was removed"
      actions={
        <>
          <Button
            variant="secondary"
            leadingIcon="arrow-left"
            onClick={() => {
              resetErrorBoundary();
              router.back({ force: true });
            }}
          >
            Go back
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              resetErrorBoundary();
              router.push(primaryRoleHome(roles));
            }}
          >
            Back to your work
          </Button>
        </>
      }
    >
      The link may be out of date, or someone removed the record since. Look for it again from your
      list.
    </ErrorPage>
  );
};
