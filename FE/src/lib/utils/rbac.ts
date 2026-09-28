import type { Permission } from '@/interfaces';

/** CBRTS permissions are roles: true when the user holds `permission`, or anything for '*'. */
export function hasPermission(permissions: readonly string[], permission: Permission): boolean {
  if (permission === '*') return true;
  return permissions.includes(permission);
}
