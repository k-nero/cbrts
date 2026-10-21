import type { BaseEntity } from './api';
import type { UserStatus } from './enums';

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  /** Role names, e.g. ["LOGISTICS_MANAGER"]. */
  roles: string[];
  /** The customer's club (GET /me); null for staff. */
  clubName?: string | null;
  /** "EF-001"; null for customers. */
  staffCode?: string | null;
  status?: UserStatus;
  /** The last sign-in or token refresh; null until the account has signed in. */
  lastActiveAt?: string | null;
}

export interface Role extends BaseEntity {
  name: string;
  description?: string | null;
}
