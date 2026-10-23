import { Flex } from 'antd';

import PageHeader from '@/components/PageHeader';
import { Button, Icon, Panel } from '@/components/ui';
import { useCustomRouter } from '@/router/route.hook';
import { primaryRoleHome, useAuthStore } from '@/stores/authStore';

/** Another staff role following a shared link: say why, and point back to their own work. */
export const NotAllowed = () => {
  const router = useCustomRouter();
  const roles = useAuthStore((state) => state.roles);
  return (
    <Flex vertical gap={28}>
      <PageHeader title="Audit log" summary="Kept for the logistics manager." />
      <Panel>
        <div className="p-4">
          <Flex vertical align="start" gap={16}>
            <Flex
              component="span"
              align="center"
              justify="center"
              className="h-11 w-11 rounded-full bg-muted text-ink-2"
            >
              <Icon name="lock" size={20} />
            </Flex>
            <h2 className="type-h3 m-0 text-ink">
              Only the logistics manager can see the audit log
            </h2>
            <p className="type-body-m m-0 max-w-160 text-ink-2">
              It records every decision on every job, including yours, so it’s kept to one role. If
              you need an entry as evidence, ask the logistics manager to export it for you.
            </p>
            <Button
              variant="secondary"
              leadingIcon="arrow-left"
              onClick={() => router.push(primaryRoleHome(roles))}
            >
              Back to your work
            </Button>
          </Flex>
        </div>
      </Panel>
    </Flex>
  );
};
