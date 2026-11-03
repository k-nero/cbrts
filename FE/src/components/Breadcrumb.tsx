import { FC, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb as BreadcrumbAnt, Flex } from 'antd';

import { Icon } from '@/components/ui';
import { COLOR_TEXT_TERTIARY } from '@/constant/color';
import { useCustomRouter } from '@/router/route.hook';
import { useLayoutStore } from '@/stores/layout';

/**
 * The top bar's trail, built from the matched routes' `breadcrumb` labels (route.config.ts): the
 * list, then the record by its code and the open tab when the page names them (useBreadcrumb), as in
 * "Jobs / CBRT-2026-043 / Trip". A route with an empty label (e.g. the /staff segment) is skipped, so
 * the trail never starts at a non-destination root. Every part but the last links back, and a
 * leading arrow goes up to the page above, since the staff shell has no back links (DESIGN.md).
 */
const Breadcrumb: FC = () => {
  const router = useCustomRouter();
  const labels = useLayoutStore((s) => s.breadcrumbs);
  const tab = useLayoutStore((s) => s.breadcrumbTab);

  const pages = useMemo(
    () =>
      router.configsMatchPath
        .filter((c) => c.breadcrumb)
        .map((c) => ({ label: (c.dynamic && labels[c.segment]) || c.breadcrumb, href: c.href })),
    [router.configsMatchPath, labels],
  );
  const trail: { label: string; href?: string }[] = tab ? [...pages, { label: tab }] : pages;
  // The page above this one (Jobs from a job, whichever tab is open), not this page's first tab.
  const parent = pages.length > 1 ? pages[pages.length - 2] : undefined;
  const linkStyle = { color: COLOR_TEXT_TERTIARY };

  return (
    <Flex align="center" gap={8}>
      {parent?.href && (
        <Link
          to={parent.href}
          aria-label={`Back to ${parent.label}`}
          className="inline-flex"
          style={linkStyle}
        >
          <Icon name="arrow-left" size={16} />
        </Link>
      )}
      <BreadcrumbAnt
        separator="/"
        items={trail.map((item, index) => ({
          title:
            index < trail.length - 1 && item.href ? (
              <Link className={'type-label-s'} to={item.href} style={linkStyle}>
                {item.label}
              </Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            ),
        }))}
        style={{ fontFamily: 'var(--font-sans)', fontSize: 13 }}
      />
    </Flex>
  );
};

export default Breadcrumb;
