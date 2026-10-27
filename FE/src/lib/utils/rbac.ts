import { type Permission, RoleNameEnum } from '@/interfaces';

/** CBRTS permissions are roles: true when the user holds `permission`, or anything for '*'. */
export function hasPermission(permissions: readonly string[], permission: Permission): boolean {
  if (permission === '*') return true;
  return permissions.includes(permission);
}

/**
 * Only the logistics manager signs off a trip plan (US-F3-08); the API refuses everyone else. The coordinator
 * plans the route, load and crew but doesn't sign them off.
 */
export function canSignOffTripPlan(roles: readonly string[]): boolean {
  return roles.includes(RoleNameEnum.LOGISTICS_MANAGER);
}
