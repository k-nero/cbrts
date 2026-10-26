import client from '@/config/axios';
import type { CustomerHome } from '@/interfaces';

export const homeApi = {
  /** The signed-in club's Home: what it owes, its moves in progress and its horses. */
  getCustomerHome: () => client.get<CustomerHome>('/customer/home'),
};
