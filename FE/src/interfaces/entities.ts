import type { BaseEntity } from './api';

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  /** Role names, e.g. ["LOGISTICS_MANAGER"]. */
  roles: string[];
}

export interface Role extends BaseEntity {
  name: string;
  description?: string | null;
}
