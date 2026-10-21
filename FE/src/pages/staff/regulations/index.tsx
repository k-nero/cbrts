import { type FC, useState } from 'react';
import { App, Empty, Spin } from 'antd';
import PageHeader from '@/components/PageHeader';
import { Button, Chip, StatTile } from '@/components/ui';
import {
  useCreateRegulationDraft,
  useRegulationCatalogs,
  useRegulationVersion,
} from '@/hooks/regulation';
import { CatalogStatusEnum, type RegulationRule } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';
import { changesLabel, defaultRule, type DestinationItem } from './constants';
import DestinationList from './DestinationList';
import DraftBanner from './DraftBanner';
import RuleEditor from './RuleEditor';
import RulesTable from './RulesTable';
import VersionsPanel from './VersionsPanel';

/** "21 d", or a dash while the version hasn't loaded. */
const days = (value?: number) => (value === undefined || value === null ? '—' : `${value} d`);

/**
 * The transport specialist's regulation catalog: pick a destination, read its rules, edit them in a
 * draft and publish. Approved jobs keep the version they were pinned to.
 */
export const RegulationsPage: FC = () => {
  const { message } = App.useApp();
  const { data: catalogs = [], isLoading: loadingCatalogs } = useRegulationCatalogs();
  const createDraft = useCreateRegulationDraft();

  const [destinationId, setDestinationId] = useState('KH');
  const catalog = catalogs.find((c) => c.countryCode === destinationId || c.id === destinationId);
  const active = catalog?.activeVersion;
  // A destination opens on its draft when it has one, else on the published version.
  const versionId = catalog?.draftVersion?.id || active?.id || null;
  const { data: version, isLoading: loadingVersion } = useRegulationVersion(versionId);

  const rules = version?.rules ?? [];
  const [pickedRuleId, setPickedRuleId] = useState<string | null>(null);
  const rule = rules.find((r) => r.id === pickedRuleId) ?? defaultRule(rules);
  const isDraft = version?.status === CatalogStatusEnum.DRAFT;

  const countries: DestinationItem[] = catalogs.map((c) => ({
    id: c.countryCode,
    code: c.countryCode,
    label: c.name.replace(' import', ''),
    version: c.activeVersion ? `v${c.activeVersion.versionNo}` : '—',
    hasDraft: Boolean(c.draftVersion),
  }));

  const startDraft = async () => {
    if (!catalog?.id) return;
    try {
      await createDraft.mutateAsync(catalog.id);
      message.success('Created new draft regulation version');
    } catch (err: unknown) {
      message.error(apiErrorMessage(err, 'Failed to create draft'));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Regulation catalog"
        summary="Validity rules for each destination country. Publishing creates a new version; approved jobs keep the version they were pinned to."
        right={
          catalog?.draftVersion ? (
            <Chip tone="warn" dot={true}>
              Draft v{catalog.draftVersion.versionNo}
              {isDraft ? ` · ${changesLabel(version?.changesCount)}` : ''}
            </Chip>
          ) : (
            <Button
              variant="secondary"
              onClick={startDraft}
              disabled={!catalog || createDraft.isPending}
            >
              Create draft version
            </Button>
          )
        }
      />

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <DestinationList
          countries={countries}
          selectedId={destinationId}
          onSelect={setDestinationId}
        />

        <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
          {loadingCatalogs || loadingVersion ? (
            <div className="flex items-center justify-center py-24">
              <Spin size="large" />
            </div>
          ) : !catalog || !version ? (
            <div className="rounded-lg border border-line bg-card p-12 text-center">
              <Empty
                description={
                  catalog
                    ? 'This catalog has no version yet. Create a draft to start its rules.'
                    : 'Choose a destination to see its rules.'
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          ) : (
            <>
              {isDraft && <DraftBanner catalog={catalog} draft={version} />}

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatTile tone="neutral" value={days(version.leadTimeDays)} label="Lead time" />
                <StatTile
                  tone="neutral"
                  value={days(version.quarantineMinDays)}
                  label="Quarantine minimum"
                />
                <StatTile
                  tone="neutral"
                  value={days(version.arrivalBufferDays)}
                  label="Arrival buffer"
                />
                <StatTile
                  tone="info"
                  value={String(active?.pinnedJobsCount ?? 0)}
                  label={active ? `Jobs pinned to v${active.versionNo}` : 'Jobs pinned'}
                />
              </div>

              <RulesTable
                title={`Document rules · ${catalog.name}`}
                rules={rules}
                selectedRuleId={rule?.id}
                onEdit={(r: RegulationRule) => setPickedRuleId(r.id)}
              />

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <RuleEditor key={rule?.id ?? 'none'} rule={rule} editable={isDraft} />
                <VersionsPanel catalog={catalog} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegulationsPage;
