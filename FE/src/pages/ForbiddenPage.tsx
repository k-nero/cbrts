import { Button, Flex, Result } from 'antd';

import { useCustomRouter } from '@/router/route.hook';
import { primaryRoleHome, useAuthStore } from '@/stores/authStore';

const ForbiddenPage = () => {
  const router = useCustomRouter();
  const roles = useAuthStore((state) => state.roles);
  return (
    <Flex justify="center" align="center" style={{ minHeight: '100vh' }}>
      <Result
        status="403"
        title="403"
        subTitle="You don’t have access to this area."
        extra={
          <Button type="primary" onClick={() => router.push(primaryRoleHome(roles))}>
            Back to your work
          </Button>
        }
      />
    </Flex>
  );
};

export default ForbiddenPage;
