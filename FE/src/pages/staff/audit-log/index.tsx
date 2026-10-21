import { AuditLedger } from './AuditLedger';
import { NotAllowed } from './NotAllowed';

import { RoleNameEnum } from '@/interfaces';
import { useAuthStore } from '@/stores/authStore';

/** Audit log (logistics manager only, US-00-06): who did what, when and why. */
const AuditLogPage = () => {
  const roles = useAuthStore((state) => state.roles);
  if (!(roles as string[]).includes(RoleNameEnum.LOGISTICS_MANAGER)) return <NotAllowed />;
  return <AuditLedger />;
};

export default AuditLogPage;
