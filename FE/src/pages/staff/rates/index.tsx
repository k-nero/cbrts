import { type FC, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { App, Skeleton } from 'antd';
import { useSearchParams } from 'react-router-dom';

import { CorridorList } from './CorridorList';
import { DraftPanel } from './DraftPanel';
import { BreaksModal } from './BreaksModal';
import { ClassModal } from './ClassModal';
import { LineModal } from './LineModal';
import { PoliciesModal } from './PoliciesModal';
import { VersionsPanel } from './VersionsPanel';
import { CorridorRates, type Editing } from './CorridorRates';

import PageHeader from '@/components/PageHeader';
import { Button, Callout, Panel } from '@/components/ui';
import { queryKeys } from '@/constant/query';
import {
  useDeleteRateLine,
  useDeleteServiceClass,
  useRateCatalog,
  useRateCorridor,
} from '@/hooks/rates';
import type { RateLine, ServiceClassRow } from '@/interfaces';
import { apiErrorMessage, draftRefusal, pickCorridor } from '@/lib/utils';

/**
 * Rate catalog (US-Q-10, spec §7.1): rates for each corridor and service class, read from the draft when
 * one is open and from the current version otherwise. A quotation pins the version it was built from.
 */
const RatesPage: FC = () => {
  const catalogQuery = useRateCatalog();
  const catalog = catalogQuery.data;
  const [params, setParams] = useSearchParams();
  const picked = pickCorridor(catalog?.corridors ?? [], params.get('corridor'));
  const corridorId = picked.id;
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

  /**
   * Someone published or discarded the draft meanwhile, or replaced it (an old row is gone): say so and
   * reload the catalog.
   */
  const onDraftGone = (error: unknown): boolean => {
    const refusal = draftRefusal(error);
    if (!refusal) return false;
    if (refusal === 'no-draft')
      setNotice(
        'This draft was published or discarded by someone else. The catalog has been reloaded.',
      );
    else
      message.warning(
        'That row changed since the page loaded, so nothing was saved. The catalog has been reloaded.',
      );
    void qc.invalidateQueries({ queryKey: queryKeys.rates.all() });
    return true;
  };

  const confirmRemove = (what: string, remove: () => Promise<unknown>, everyCorridor = false) =>
    modal.confirm({
      title: everyCorridor
        ? `Remove ${what} from every corridor?`
        : `Remove ${what} from the draft?`,
      content: everyCorridor
        ? 'This line applies to every corridor, so removing it removes it from all of them. It stays in the published version until the draft is published.'
        : 'It stays in the published version until the draft is published.',
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
            confirmRemove(
              row.description,
              () => deleteLine.mutateAsync({ lineId: row.id, view: view.corridor.id }),
              row.everyCorridor,
            ),
          onEditBreaks: () => setModalOpen({ kind: 'breaks' }),
          onEditPolicies: () => setModalOpen({ kind: 'policies' }),
        }
      : null;

  // A failed first load goes to the error boundary; a section still waiting shows its skeleton.
  const loading = (
    <Panel>
      <Skeleton active title={false} paragraph={{ rows: 6 }} />
    </Panel>
  );

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Rate catalog"
        summary="Rates for each corridor and service class. A quotation pins the version it was built from, so later changes never alter an issued quote."
      />
      {!catalog ? (
        loading
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
            {picked.unknown && (
              <Callout
                tone="warn"
                title="That corridor isn't in the rate catalog."
                action={
                  corridorId && (
                    <Button size="sm" variant="secondary" onClick={() => select(corridorId)}>
                      Show this corridor
                    </Button>
                  )
                }
              >
                {corridorId
                  ? 'The link may be out of date. Showing the first corridor instead.'
                  : 'The link may be out of date.'}
              </Callout>
            )}
            {notice && (
              <Callout tone="warn" title={notice}>
                Create a new draft to make further changes.
              </Callout>
            )}
            <DraftPanel catalog={catalog} onDraftGone={onDraftGone} />
            {!corridorId ? (
              <Panel title="No corridors yet">
                <p className="type-body-m m-0 text-ink-2">
                  There is no corridor to price. Rates are set per corridor once the route catalog
                  has one.
                </p>
              </Panel>
            ) : viewQuery.data ? (
              <CorridorRates catalog={catalog} view={viewQuery.data} editing={editing} />
            ) : (
              loading
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
