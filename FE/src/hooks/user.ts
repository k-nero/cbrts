import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { type UserGroup, type UserInput, userGroupCounts, usersApi } from '@/apis/user';
import { useCrudResource } from '@/hooks/crud';
import type { User } from '@/interfaces';

/** Users & roles list, paging, sort and mutations (logistics manager); `role` and `group` narrow the list. */
export const useUsers = (role?: string, group?: UserGroup) => {
  const extra = useMemo(
    () => (role || group ? { ...(role && { role }), ...(group && { group }) } : undefined),
    [role, group],
  );
  return useCrudResource<User, UserInput>('admin-users', usersApi, undefined, extra);
};

/** The counts on the Users & roles tabs; under 'admin-users', so an invite or an edit refreshes them. */
export const useUserGroupCounts = () =>
  useQuery({ queryKey: ['admin-users', 'counts'], queryFn: userGroupCounts });
