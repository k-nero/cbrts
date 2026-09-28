import { type UserInput, usersApi } from '@/apis/user';
import { useCrudResource } from '@/hooks/crud';
import type { User } from '@/interfaces';

/** Users & roles list, paging, sort and mutations (logistics manager). */
export const useUsers = () => useCrudResource<User, UserInput>('admin-users', usersApi);
