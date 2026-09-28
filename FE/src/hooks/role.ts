import { useQuery } from '@tanstack/react-query';

import { rolesApi } from '@/apis/role';
import { queryKeys } from '@/constant/query';

export const useRoles = () =>
  useQuery({ queryKey: queryKeys.roles(), queryFn: rolesApi.list, staleTime: 5 * 60_000 });
