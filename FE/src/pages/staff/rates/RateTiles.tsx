import { type FC } from 'react';
import { Col, Row } from 'antd';

import { StatTile } from '@/components/ui';
import type { RateCatalog, RateCorridorView } from '@/interfaces';
import { formatDate } from '@/lib/utils';

/** The four facts about the corridor and the version it is read from. */
export const RateTiles: FC<{ catalog: RateCatalog; view: RateCorridorView }> = ({
  catalog,
  view,
}) => {
  const current = catalog.versions.find((v) => v.id === catalog.currentVersionId);
  return (
    <Row gutter={[16, 16]}>
      <Col span={6}>
        <StatTile
          value={
            view.corridor.distanceKm == null
              ? '—'
              : `${view.corridor.distanceKm.toLocaleString('en-US')} km`
          }
          label="Distance"
        />
      </Col>
      <Col span={6}>
        <StatTile value={view.corridor.crossingCount} label="Border crossings" />
      </Col>
      <Col span={6}>
        <StatTile
          tone="info"
          value={current?.quotationsPinned ?? 0}
          label={current ? `Quotes pinned to v${current.versionNo}` : 'Quotes pinned'}
        />
      </Col>
      <Col span={6}>
        <StatTile
          value={current?.publishedAt ? formatDate(current.publishedAt) : '—'}
          label="Last published"
        />
      </Col>
    </Row>
  );
};
