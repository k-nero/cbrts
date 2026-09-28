import { FC } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Permission } from '@/interfaces';
import { hasPermission } from '@/lib';
import { useAuthStore } from '@/stores/authStore';

type Props = {
  permission: Permission | Permission[] | undefined;
  children: React.ReactNode;
};

const RequiredPermission: FC<Props> = ({ permission, children }) => {
  // CBRTS permissions are roles (interfaces/enums.ts, Permission).
  const permissions = useAuthStore(useShallow((state) => state.roles));

  if (!permission) return <span></span>;

  const allowed = Array.isArray(permission)
    ? permission.some((p) => hasPermission(permissions, p))
    : hasPermission(permissions, permission);

  if (!allowed) return <span></span>;

  return <>{children}</>;
};

export default RequiredPermission;
