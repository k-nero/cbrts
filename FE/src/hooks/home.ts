import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { homeApi, type HomeDemoState } from '@/apis/home';
import { queryKeys } from '@/constant/query';

const DEMO_STATES: HomeDemoState[] = ['owing', 'clear', 'road'];

/** The signed-in club's Home: what it owes, its moves and its horses. */
export const useCustomerHome = () => {
  // Demo only (apis/home.ts): ?demo=clear | road picks one of the Figma Home states.
  const [params] = useSearchParams();
  const raw = params.get('demo');
  const demo = DEMO_STATES.find((s) => s === raw) ?? 'owing';
  return useQuery({
    queryKey: [...queryKeys.customerHome(), demo],
    queryFn: () => homeApi.getCustomerHome(demo),
  });
};
