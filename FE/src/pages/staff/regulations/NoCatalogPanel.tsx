import type { FC } from 'react';
import { Flex } from 'antd';

import { Button, Callout, Panel } from '@/components/ui';
import type { RegulationCountry } from '@/interfaces';

type Props = {
  country: RegulationCountry;
  onCreate: () => void;
};

/** A country we serve that has no regulation catalog yet, with the way to start one (US-F2-12). */
export const NoCatalogPanel: FC<Props> = ({ country, onCreate }) => (
  <Panel title={`${country.name} · no regulation catalog yet`}>
    <Flex vertical gap={16} align="start">
      <Callout tone="warn" title="Not a destination yet">
        Jobs into {country.name} can&apos;t get a clearance checklist until its catalog has a
        published version.
      </Callout>
      <p className="type-body-m m-0 text-ink-2">
        Create the catalog to start draft v1: set its lead times, quarantine minimum and arrival
        buffer, add the documents {country.name} requires, then publish.
      </p>
      <Button variant="primary" onClick={onCreate}>
        Create catalog
      </Button>
    </Flex>
  </Panel>
);
