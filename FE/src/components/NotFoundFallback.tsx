import { FC } from 'react';
import { Button, Result } from 'antd';

import { useCustomRouter } from '@/router/route.hook';

export const NotFoundFallback: FC<{ resetErrorBoundary: () => void }> = ({
  resetErrorBoundary,
}) => {
  const router = useCustomRouter();
  return (
    <Result
      status="404"
      title="404"
      subTitle="This page doesn’t exist, or the record was removed."
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
};
