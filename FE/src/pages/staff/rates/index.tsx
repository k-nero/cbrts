import { type FC, type ReactNode } from 'react';
import { Skeleton } from 'antd';
import { useSearchParams } from 'react-router-dom';

import { CorridorList } from './CorridorList';
import { BreaksPanel, ClassTable, LineTable, PolicyPanel } from './tables';
import { VersionsPanel } from './VersionsPanel';

import PageHeader from '@/components/PageHeader';
import { Button, Callout, Panel, StatTile } from '@/components/ui';
import { useRateCatalog, useRateCorridor } from '@/hooks/rates';
import type { RateCatalog, RateCorridorView } from '@/interfaces';
import { corridorShort, formatDate } from '@/lib/utils';

const LoadError: FC<{ what: string; onRetry: () => void }> = ({ what, onRetry }) => (
  <Callout
    tone="bad"
    title={`The ${what} didn't load.`}
    action={
      <Button size="sm" variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    }
  >
    Nothing has changed. Check your connection and try again.
  </Callout>
);

const Loading: FC = () => (
  <Panel>
    <Skeleton active title={false} paragraph={{ rows: 6 }} />
  </Panel>
);

/** The four facts about the corridor and the version it is read from. */
const Tiles: FC<{ catalog: RateCatalog; view: RateCorridorView }> = ({ catalog, view }) => {
  const current = catalog.versions.find((v) => v.id === catalog.currentVersionId);
  return (
    <div className="grid grid-cols-4 gap-4">
      <StatTile
        value={
          view.corridor.distanceKm == null
            ? '—'
            : `${view.corridor.distanceKm.toLocaleString('en-US')} km`
        }
        label="Distance"
      />
      <StatTile value={view.corridor.crossingCount} label="Border crossings" />
      <StatTile
        tone="info"
        value={current?.quotationsPinned ?? 0}
        label={current ? `Quotes pinned to v${current.versionNo}` : 'Quotes pinned'}
      />
      <StatTile
        value={current?.publishedAt ? formatDate(current.publishedAt) : '—'}
        label="Last published"
      />
    </div>
  );
};

/** The corridor's rates as the catalog shows them; editing hooks into the slots in the next step. */
const CorridorRates: FC<{
  catalog: RateCatalog;
  view: RateCorridorView;
  slots?: {
    classAdd?: ReactNode;
    lineAdd?: ReactNode;
    breaksEdit?: ReactNode;
    policyEdit?: ReactNode;
  };
}> = ({ catalog, view, slots }) => (
  <div className="flex flex-col gap-6">
    <Tiles catalog={catalog} view={view} />
    {view.missing.length > 0 && (
      <Callout
        tone="bad"
        title={`${corridorShort(view.corridor.code)} has ${view.missing.length} missing ${view.missing.length === 1 ? 'rate' : 'rates'}`}
      >
        <span className="flex flex-col gap-1">
          {view.missing.map((m) => (
            <span key={m.description}>{m.why}</span>
          ))}
          <span>Quotations on this corridor can&apos;t be issued until they are filled in.</span>
        </span>
      </Callout>
    )}
    {view.corridor.mode === 'AIR' && (
      <ClassTable view={view} actions={null} add={slots?.classAdd} />
    )}
    <div className="grid grid-cols-2 items-start gap-6">
      <BreaksPanel view={view} edit={slots?.breaksEdit} />
      <PolicyPanel view={view} edit={slots?.policyEdit} />
    </div>
    <LineTable view={view} actions={null} add={slots?.lineAdd} />
  </div>
);

/**
 * Rate catalog (US-Q-10, spec §7.1): rates for each corridor and service class, read from the draft when
 * one is open and from the current version otherwise. A quotation pins the version it was built from.
 */
const RatesPage: FC = () => {
  const catalogQuery = useRateCatalog();
  const catalog = catalogQuery.data;
  const [params, setParams] = useSearchParams();
  const corridorId = params.get('corridor') ?? catalog?.corridors[0]?.id ?? null;
  const versionId = catalog ? (catalog.draftVersionId ?? catalog.currentVersionId) : null;
  const viewQuery = useRateCorridor(versionId, corridorId);
  const shown = catalog?.versions.find((v) => v.id === versionId);

  const select = (id: string) => setParams({ corridor: id }, { replace: true });

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Rate catalog"
        summary="Rates for each corridor and service class. A quotation pins the version it was built from, so later changes never alter an issued quote."
      />
      {catalogQuery.isError ? (
        <LoadError what="rate catalog" onRetry={() => void catalogQuery.refetch()} />
      ) : !catalog ? (
        <Loading />
      ) : !versionId ? (
        <Panel title="No rate catalog yet">
          <p className="type-body-m m-0 text-ink-2">
            No version has been published. The seeded catalog appears here once the server has
            started.
          </p>
        </Panel>
      ) : (
        <div className="grid grid-cols-[300px_minmax(0,1fr)] items-start gap-6">
          <div className="flex flex-col gap-6">
            <CorridorList
              corridors={catalog.corridors}
              selectedId={corridorId}
              versionNo={shown?.versionNo ?? null}
              onSelect={select}
            />
            <VersionsPanel versions={catalog.versions} />
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <Panel>
              <span className="type-body-m text-ink-2">
                {shown?.status === 'DRAFT'
                  ? `Showing draft v${shown.versionNo}.`
                  : `Rate catalog v${shown?.versionNo ?? ''} is current.`}
              </span>
            </Panel>
            {viewQuery.isError ? (
              <LoadError what="corridor's rates" onRetry={() => void viewQuery.refetch()} />
            ) : viewQuery.data ? (
              <CorridorRates catalog={catalog} view={viewQuery.data} />
            ) : (
              <Loading />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RatesPage;
