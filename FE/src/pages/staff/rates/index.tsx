import { type FC, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { App, Skeleton } from 'antd';
import { useSearchParams } from 'react-router-dom';

import { CorridorList } from './CorridorList';
import { DraftPanel } from './DraftPanel';
import { BreaksModal, ClassModal, LineModal, PoliciesModal } from './editors';
import { BreaksPanel, ClassTable, LineTable, PolicyPanel } from './tables';
import { VersionsPanel } from './VersionsPanel';

import PageHeader from '@/components/PageHeader';
import { Button, Callout, Panel, StatTile } from '@/components/ui';
import { queryKeys } from '@/constant/query';
import {
  useDeleteRateLine,
  useDeleteServiceClass,
  useRateCatalog,
  useRateCorridor,
} from '@/hooks/rates';
import type { RateCatalog, RateCorridorView, RateLine, ServiceClassRow } from '@/interfaces';
import { apiErrorMessage, corridorShort, draftRefusal, formatDate } from '@/lib/utils';

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

type Editing = {
  onAddClass: () => void;
  onEditClass: (row: ServiceClassRow) => void;
  onRemoveClass: (row: ServiceClassRow) => void;
  onAddLine: () => void;
  onEditLine: (row: RateLine) => void;
  onRemoveLine: (row: RateLine) => void;
  onEditBreaks: () => void;
  onEditPolicies: () => void;
};

/** The corridor's rates as the catalog shows them; with a draft open, every table can be edited. */
const CorridorRates: FC<{
  catalog: RateCatalog;
  view: RateCorridorView;
  editing: Editing | null;
}> = ({ catalog, view, editing }) => (
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
      <ClassTable
        view={view}
        actions={editing && { onEdit: editing.onEditClass, onRemove: editing.onRemoveClass }}
        add={
          editing &&
          view.serviceClasses.length < 3 && (
            <Button size="sm" variant="secondary" leadingIcon="plus" onClick={editing.onAddClass}>
              Add class
            </Button>
          )
        }
      />
    )}
    <div className="grid grid-cols-2 items-start gap-6">
      <BreaksPanel
        view={view}
        edit={
          editing && (
            <Button size="sm" variant="ghost" onClick={editing.onEditBreaks}>
              Edit
            </Button>
          )
        }
      />
      <PolicyPanel
        view={view}
        edit={
          editing && (
            <Button size="sm" variant="ghost" onClick={editing.onEditPolicies}>
              Edit
            </Button>
          )
        }
      />
    </div>
    <LineTable
      view={view}
      actions={editing && { onEdit: editing.onEditLine, onRemove: editing.onRemoveLine }}
      add={
        editing && (
          <Button size="sm" variant="secondary" leadingIcon="plus" onClick={editing.onAddLine}>
            Add line
          </Button>
        )
      }
    />
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

  const { message, modal } = App.useApp();
  const qc = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  // The notice is about the draft that vanished; a new draft makes it moot.
  const draftId = catalog?.draftVersionId;
  useEffect(() => {
    if (draftId) setNotice(null);
  }, [draftId]);
  const [modalOpen, setModalOpen] = useState<
    | { kind: 'line'; row: RateLine | null }
    | { kind: 'class'; row: ServiceClassRow | null }
    | { kind: 'breaks' }
    | { kind: 'policies' }
    | null
  >(null);
  const deleteLine = useDeleteRateLine();
  const deleteClass = useDeleteServiceClass();
  const close = () => setModalOpen(null);

  /** Someone published or discarded the draft meanwhile: say so and reload the catalog. */
  const onDraftGone = (error: unknown): boolean => {
    if (draftRefusal(error) !== 'no-draft') return false;
    setNotice(
      'This draft was published or discarded by someone else. The catalog has been reloaded.',
    );
    void qc.invalidateQueries({ queryKey: queryKeys.rates.all() });
    return true;
  };

  const confirmRemove = (what: string, remove: () => Promise<unknown>) =>
    modal.confirm({
      title: `Remove ${what} from the draft?`,
      content: 'It stays in the published version until the draft is published.',
      okText: 'Remove',
      okButtonProps: { danger: true },
      cancelText: 'Keep it',
      onOk: async () => {
        try {
          await remove();
          message.success('Removed from the draft');
        } catch (error) {
          if (!onDraftGone(error))
            message.error(apiErrorMessage(error, "It wasn't removed. Try again."));
        }
      },
    });

  const view = viewQuery.data;
  const editing: Editing | null =
    shown?.status === 'DRAFT' && view
      ? {
          onAddClass: () => setModalOpen({ kind: 'class', row: null }),
          onEditClass: (row) => setModalOpen({ kind: 'class', row }),
          onRemoveClass: (row) =>
            confirmRemove(`the ${row.serviceClass.toLowerCase()} class`, () =>
              deleteClass.mutateAsync({
                corridorId: view.corridor.id,
                serviceClass: row.serviceClass,
              }),
            ),
          onAddLine: () => setModalOpen({ kind: 'line', row: null }),
          onEditLine: (row) => setModalOpen({ kind: 'line', row }),
          onRemoveLine: (row) =>
            confirmRemove(row.description, () =>
              deleteLine.mutateAsync({ lineId: row.id, view: view.corridor.id }),
            ),
          onEditBreaks: () => setModalOpen({ kind: 'breaks' }),
          onEditPolicies: () => setModalOpen({ kind: 'policies' }),
        }
      : null;

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
            {notice && (
              <Callout tone="warn" title={notice}>
                Create a new draft to make further changes.
              </Callout>
            )}
            <DraftPanel catalog={catalog} onDraftGone={onDraftGone} />
            {viewQuery.isError ? (
              <LoadError what="corridor's rates" onRetry={() => void viewQuery.refetch()} />
            ) : viewQuery.data ? (
              <CorridorRates catalog={catalog} view={viewQuery.data} editing={editing} />
            ) : (
              <Loading />
            )}
          </div>
        </div>
      )}
      {view && modalOpen?.kind === 'line' && (
        <LineModal
          open
          editing={modalOpen.row}
          view={view}
          onClose={close}
          onDraftGone={onDraftGone}
        />
      )}
      {view && modalOpen?.kind === 'class' && (
        <ClassModal
          open
          editing={modalOpen.row}
          view={view}
          onClose={close}
          onDraftGone={onDraftGone}
        />
      )}
      {view && modalOpen?.kind === 'breaks' && (
        <BreaksModal open view={view} onClose={close} onDraftGone={onDraftGone} />
      )}
      {view && modalOpen?.kind === 'policies' && (
        <PoliciesModal open view={view} onClose={close} onDraftGone={onDraftGone} />
      )}
    </div>
  );
};

export default RatesPage;
