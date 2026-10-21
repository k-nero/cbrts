/** The five CBRTS roles, as the backend names them (entity/enums/RoleName.java). */
export const RoleNameEnum = {
  CUSTOMER: 'CUSTOMER',
  LOGISTICS_MANAGER: 'LOGISTICS_MANAGER',
  TRANSPORT_SPECIALIST: 'TRANSPORT_SPECIALIST',
  FLEET_COORDINATOR: 'FLEET_COORDINATOR',
  ESCORT: 'ESCORT',
} as const;
export type RoleName = (typeof RoleNameEnum)[keyof typeof RoleNameEnum];

/** How each role is named in the UI (sentence case, as the sidebar role tag reads). */
export const ROLE_LABEL: Record<RoleName, string> = {
  CUSTOMER: 'Customer',
  LOGISTICS_MANAGER: 'Logistics manager',
  TRANSPORT_SPECIALIST: 'Transport specialist',
  FLEET_COORDINATOR: 'Fleet & route coordinator',
  ESCORT: 'Escort',
};

/** What RequiredPermission and TableActionDropdown check: a role, or '*' for anyone signed in. */
export type Permission = RoleName | '*';

/** An account's state (entity/enums/UserStatus.java). */
export const UserStatusEnum = {
  INVITED: 'INVITED',
  ACTIVE: 'ACTIVE',
  LOCKED: 'LOCKED',
  DISABLED: 'DISABLED',
} as const;
export type UserStatus = (typeof UserStatusEnum)[keyof typeof UserStatusEnum];
