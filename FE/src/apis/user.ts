import client from '@/config/axios';

import { type CrudListParams, makeCrudApi } from './crudFactory';

import type { User } from '@/interfaces';

export interface UserInput {
  firstName: string;
  lastName: string;
  /** Required on create; absent on update (the server keeps the existing address). */
  email?: string;
  /** Required on create; absent on update. */
  password?: string;
  phone?: string | null;
  /** Role names (e.g. ["TRANSPORT_SPECIALIST"]); the backend matches by name. */
  roles?: string[];
}

/** The Users & roles tabs (UserGroup on the backend). */
export const UserGroupEnum = {
  STAFF: 'STAFF',
  CUSTOMERS: 'CUSTOMERS',
  INVITES: 'INVITES',
} as const;
export type UserGroup = (typeof UserGroupEnum)[keyof typeof UserGroupEnum];

/** How many accounts each tab holds, for its label. */
export interface UserGroupCounts {
  staff: number;
  customers: number;
  invites: number;
}

export interface UserListParams extends CrudListParams {
  role?: string;
  group?: UserGroup;
}

export const usersApi = makeCrudApi<User, UserInput, UserListParams>('/admin/users');

export const userGroupCounts = () =>
  client.get<UserGroupCounts>('/admin/users/counts').then((r) => r.data);
