import client from '@/config/axios';
import { type CrudListParams, makeCrudApi } from './crudFactory';

import type { Horse, HorseInput, SizeClass } from '@/interfaces';

export interface HorseListParams extends CrudListParams {
  /** true lists archived horses only. */
  archived?: boolean;
}

/** The signed-in club's horses (slice 1, /api/v1/customer/horses). There is no delete: horses are archived. */
export const horsesApi = makeCrudApi<Horse, HorseInput, HorseListParams>('/customer/horses');

/** Archive, never delete; refused with 409 HORSE_IN_USE while the horse is on an active request or job. */
export const archiveHorse = (id: string): Promise<Horse> =>
  client.post<Horse>(`/customer/horses/${id}/archive`).then((r) => r.data);

/** The height bands, so a form can show the derived class as the height is typed. */
export const getSizeClasses = (): Promise<SizeClass[]> =>
  client.get<SizeClass[]>('/customer/horse-size-classes').then((r) => r.data);
