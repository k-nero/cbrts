import type { RouteConfig } from '@/router/route.type';

type Path = { path: string; routeName: string };

/** Flattens the route tree into full paths, keyed by route name. */
export const getRoutesConfigPaths = (rc: RouteConfig, parentPath?: string): Path[] => {
  const res: Path[] = [];
  const currentPath = parentPath ?? '';
  for (const r of rc) {
    if (r.children) res.push(...getRoutesConfigPaths(r.children, currentPath + r.path));
    res.push({ path: currentPath + r.path, routeName: r.name });
  }
  return res;
};

/** "fleet-calendar" → "Fleet calendar" (sentence case, as the UI writes labels). */
export function dashToTitle(s: string): string {
  const words = s.trim().split(/[-_]+/).filter(Boolean).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
