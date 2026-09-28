import { FC, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb as BreadcrumbAnt } from 'antd';

import { COLOR_TEXT_TERTIARY } from '@/constant/color';
import { useCustomRouter } from '@/router/route.hook';
import { useLayoutStore } from '@/stores/layout';

/**
 * The top bar's trail, built from the matched routes' `breadcrumb` labels (route.config.ts).
 * A route with an empty label (e.g. the /staff segment) is skipped, so the trail never starts at
 * a non-destination root. A page can replace the trail with setBreadcrumbOverride.
 */
const Breadcrumb: FC = () => {
  const router = useCustomRouter();
  const breadcrumbOverride = useLayoutStore((state) => state.breadcrumbOverride);

  const items = useMemo(() => {
    const trail =
      breadcrumbOverride && breadcrumbOverride.length > 0
        ? breadcrumbOverride.map((i) => ({ label: i.label, href: i.href }))
        : router.configsMatchPath
            .filter((c) => c.breadcrumb)
            .map((c) => ({ label: c.breadcrumb, href: router.paths.get(c.name as never) }));
    return trail.map((item, index) => ({
      title:
        index < trail.length - 1 && item.href ? (
          <Link to={item.href} style={{ color: COLOR_TEXT_TERTIARY }}>
            {item.label}
          </Link>
        ) : (
          <span>{item.label}</span>
        ),
    }));
  }, [breadcrumbOverride, router.configsMatchPath, router.paths]);

  return (
    <BreadcrumbAnt
      separator="/"
      items={items}
      style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
    />
  );
};

export default Breadcrumb;
