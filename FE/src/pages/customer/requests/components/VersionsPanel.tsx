import type { FC } from 'react';
import { Flex } from 'antd';

import { Chip, Panel } from '@/components/ui';
import type { TransportRequest } from '@/interfaces';
import { latestRevision, versionLine } from '@/lib/utils';

/**
 * Every version the customer sent (US-F1-04): a returned request keeps v1 when v2 goes out, so nothing
 * sent is lost. `current` marks the latest while the customer is changing it.
 */
export const VersionsPanel: FC<{ request: TransportRequest; current?: boolean }> = ({
  request,
  current,
}) => {
  const latest = latestRevision(request);
  if (latest === 0) return null;
  return (
    <Panel title="Versions">
      <Flex component="ul" vertical gap={10} className="list-none">
        {request.revisions.map((v) => (
          <Flex component="li" align="center" justify="space-between" gap={12} key={v.revisionNo}>
            <span className="type-body-s text-ink-2">{versionLine(v)}</span>
            {current && v.revisionNo === latest && (
              <Chip tone="info" dot={false}>
                Current
              </Chip>
            )}
          </Flex>
        ))}
      </Flex>
      {current && (
        <p className="type-body-s m-0 mt-3 text-ink-3">
          Your changes become v{latest + 1}. You and the logistics manager both keep v{latest}, so
          nothing you sent is lost.
        </p>
      )}
    </Panel>
  );
};
