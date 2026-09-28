import client from '@/config/axios';
import type { PagedResponse } from '@/interfaces';

export interface CrudListParams {
  page?: number;
  size?: number;
  q?: string;
  /** Spring Data sort expression, e.g. `createdAt,desc`. */
  sort?: string;
}

export interface CrudApi<T, Input, ListParams extends CrudListParams = CrudListParams> {
  list: (params: ListParams) => Promise<PagedResponse<T>>;
  get: (id: string) => Promise<T>;
  create: (body: Input) => Promise<T>;
  update: (id: string, body: Input) => Promise<T>;
  remove: (id: string) => Promise<void>;
  basePath: string;
}

/**
 * Build a standard CRUD client over `basePath`. Each resource module exports a
 * concrete `CrudApi<T, Input>` and the query factory in `src/queries/crud.ts`
 * wraps it with consistent React Query keys + invalidation.
 */
export function makeCrudApi<T, Input, ListParams extends CrudListParams = CrudListParams>(
  basePath: string,
): CrudApi<T, Input, ListParams> {
  return {
    basePath,
    list: (params: ListParams) =>
      client.get<PagedResponse<T>>(basePath, { params }).then((r) => r.data),
    get: (id: string) => client.get<T>(`${basePath}/${id}`).then((r) => r.data),
    create: (body: Input) => client.post<T>(basePath, body).then((r) => r.data),
    update: (id: string, body: Input) =>
      client.put<T>(`${basePath}/${id}`, body).then((r) => r.data),
    remove: (id: string) => client.delete(`${basePath}/${id}`).then(() => undefined),
  };
}
