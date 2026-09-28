import type { RoleName } from '@/interfaces';

type RolePage = RoleName | '*';

export interface RouteConfigItem {
  name: string;
  path: string;
  type?: 'authenticated' | 'public' | 'unauthenticated';
  roles: readonly RolePage[];
  breadcrumb: string;
  children?: readonly RouteConfigItem[];
}

export type RouteConfig = readonly RouteConfigItem[];

export type NameInto<T extends readonly RouteConfigItem[]> = T extends readonly [
  infer X extends RouteConfigItem,
  ...infer Y extends RouteConfigItem[],
]
  ? | X['name']
    | NameInto<Y>
    | (X['children'] extends readonly RouteConfigItem[] ? NameInto<X['children']> : never)
  : never;
