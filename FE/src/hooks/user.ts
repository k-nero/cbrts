import { useMemo } from 'react';

import { type UserInput, usersApi } from '@/apis/user';
import { useCrudResource } from '@/hooks/crud';
import type { User } from '@/interfaces';

/** Users & roles list, paging, sort and mutations (logistics manager); `role` narrows the list. */
export const useUsers = (role?: string) => {
  const extra = useMemo(() => (role ? { role } : undefined), [role]);
  return useCrudResource<User, UserInput>('admin-users', usersApi, undefined, extra);
};
