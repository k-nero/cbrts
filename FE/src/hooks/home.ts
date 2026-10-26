import { useQuery } from '@tanstack/react-query';

import { homeApi } from '@/apis/home';
import { queryKeys } from '@/constant/query';
import type { CustomerHome } from '@/interfaces';

/** The signed-in club's Home: what it owes, its moves and its horses. */
export const useCustomerHome = () =>
  useQuery({
    queryKey: queryKeys.customerHome(),
    queryFn: async (): Promise<CustomerHome> => (await homeApi.getCustomerHome()).data,
  });
