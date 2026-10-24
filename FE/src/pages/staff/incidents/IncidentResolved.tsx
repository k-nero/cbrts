import type { FC } from 'react';
import { Flex } from 'antd';

import { Chip, Panel } from '@/components/ui';
import type { Incident } from '@/interfaces';
import { formatDayTime } from '@/lib/utils';

/** How the incident was closed (US-F5-05): the resolution, the closing note, who closed it and when. */
export const IncidentResolved: FC<{ incident: Incident }> = ({ incident }) => (
  <Panel title="Closed" extra={<Chip tone="ok">Resolved</Chip>}>
    <Flex vertical gap={8}>
      <p className="type-label-m m-0 text-ink">{incident.resolution}</p>
      <p className="type-body-m m-0 whitespace-pre-line text-ink-2">{incident.closingNote}</p>
      <p className="type-body-s m-0 text-ink-3">
        {incident.resolvedByName ?? 'The logistics manager'}
        {incident.resolvedAt ? `, ${formatDayTime(incident.resolvedAt)}` : ''}
      </p>
    </Flex>
  </Panel>
);
