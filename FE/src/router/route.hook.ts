import { useCallback, useMemo } from 'react';
import { type NavigateOptions, useLocation, useNavigate } from 'react-router-dom';

import { routesConfig } from './route.config';
import type { NameInto, RouteConfigItem } from './route.type';

import { getRoutesConfigPaths } from '@/lib';
import { useLayoutStore } from '@/stores/layout';

export const DYNAMIC_PATH_REGEX = /^\/\{.*}$/;

export type RouteName = NameInto<typeof routesConfig>;

type AdditionOption = { force?: boolean };

/** Navigation that asks before leaving a form with unsaved changes (FormWrapper registers them). */
export const useRouterNavigation = () => {
  const navigate = useNavigate();

  const navigateWithConfirmation = useCallback((cb: () => void, isForce: boolean = false) => {
    const state = useLayoutStore.getState();
    if (!state.hasUnsavedChanges() || isForce) {
      cb();
      return;
    }
    if (window.confirm('You have unsaved changes. Leave this page?')) {
      state.resetNavigateItems();
      cb();
    }
  }, []);

  return useMemo(
    () => ({
      push: (href: string, { force, ...options }: NavigateOptions & AdditionOption = {}) =>
        navigateWithConfirmation(() => navigate(href, options), force),
      replace: (href: string, { force, ...options }: NavigateOptions & AdditionOption = {}) =>
        navigateWithConfirmation(() => navigate(href, { ...options, replace: true }), force),
      back: ({ force }: AdditionOption = {}) => navigateWithConfirmation(() => navigate(-1), force),
      forward: ({ force }: AdditionOption = {}) =>
        navigateWithConfirmation(() => navigate(1), force),
      navigateWithConfirmation,
    }),
    [navigate, navigateWithConfirmation],
  );
};

export const useCustomRouter = () => {
  const { pathname } = useLocation();
  const navigation = useRouterNavigation();

  const paths = useMemo(() => {
    const configPaths = getRoutesConfigPaths(routesConfig);
    return {
      get: (
        routeName: RouteName,
        options?: {
          pathParams?: (string | number)[];
          queryParams?: Record<string, string | number | boolean | undefined>;
        },
      ) => {
        let path = configPaths.find((p) => p.routeName === routeName)?.path ?? '';
        // Fills "{id}" and React Router's ":id" placeholders alike ("/jobs/:id").
        for (const param of options?.pathParams ?? []) {
          path = path.replace(/\{(.*?)}|:[^/]+/, String(param));
        }
        const query = Object.entries(options?.queryParams ?? {}).filter(([, v]) => v !== undefined);
        const search = new URLSearchParams(query.map(([k, v]) => [k, String(v)])).toString();
        return path + (search ? `?${search}` : '');
      },
    };
  }, []);

  const checkCurrentPathMatch = useCallback(
    (routeName: RouteName) => {
      const pattern = paths.get(routeName).replace(/\{[^}]+}|:[^/]+/g, '[^/]+');
      return new RegExp(`^${pattern}$`).test(pathname);
    },
    [pathname, paths],
  );

  /** The config of every route along the current path, outermost first. */
  const configsMatchPath = useMemo(() => {
    const segments = pathname
      .split('/')
      .filter(Boolean)
      .map((s) => `/${s}`);
    let level: readonly RouteConfigItem[] = routesConfig;
    const result: Pick<RouteConfigItem, 'roles' | 'type' | 'name' | 'breadcrumb'>[] = [];
    for (const segment of segments) {
      const found = level.find((c) => DYNAMIC_PATH_REGEX.test(c.path) || c.path === segment);
      if (!found) break;
      result.push({
        roles: found.roles,
        type: found.type,
        name: found.name,
        breadcrumb: found.breadcrumb,
      });
      level = found.children ?? [];
    }
    return result;
  }, [pathname]);

  return { ...navigation, configsMatchPath, routesConfig, paths, checkCurrentPathMatch };
};
