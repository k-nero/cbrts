import client from '@/config/axios';
import type { Role } from '@/interfaces';

/** Roles follow the spec and are seeded; the app only reads them. */
export const rolesApi = {
  list: (): Promise<Role[]> => client.get<Role[]>('/admin/roles').then((r) => r.data),
};
