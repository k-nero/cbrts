import { type FC, useState } from 'react';
import { App, Spin } from 'antd';
import PageHeader from '@/components/PageHeader';
import { Button, Chip, StatTile } from '@/components/ui';
import {
  useCreateRegulationDraft,
  useRegulationCatalogs,
  useRegulationVersion,
} from '@/hooks/regulation';
import { CatalogStatusEnum, type RegulationRule } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';
import { defaultRule, type DestinationItem } from './constants';
import DestinationList from './DestinationList';
import DraftBanner from './DraftBanner';
import RuleEditor from './RuleEditor';
import RulesTable from './RulesTable';
import VersionsPanel from './VersionsPanel';

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
  // A destination opens on its draft when it has one, else on the published version.
  const versionId = catalog?.draftVersion?.id || catalog?.activeVersion?.id || null;
  const { data: version, isLoading: loadingVersion } = useRegulationVersion(versionId);

  const rules = version?.rules ?? [];
  const [pickedRuleId, setPickedRuleId] = useState<string | null>(null);
  const rule = rules.find((r) => r.id === pickedRuleId) ?? defaultRule(rules);

  const isDraft = version?.status === CatalogStatusEnum.DRAFT;
  const hasDraft = Boolean(catalog?.draftVersion);
  // FIXME(mock): 8 is the Figma frame's next version, used when the catalog has no version at all.
  const draftVersionNo =
    catalog?.draftVersion?.versionNo ??
    (catalog?.activeVersion ? catalog.activeVersion.versionNo + 1 : 8);

  const countries: DestinationItem[] = catalogs.map((c) => ({
    id: c.countryCode,
    code: c.countryCode,
    label: c.countryCode === 'KH' ? 'Cambodia' : c.name.replace(' import', ''),
    version: `v${c.activeVersion?.versionNo ?? 1}`,
    isCountry: true,
    countryCode: c.countryCode,
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
        summary="Validity rules for each destination and border crossing. Publishing creates a new version; approved jobs keep the version they were pinned to."
        right={
          hasDraft ? (
            <Chip tone="warn" dot={true}>
              Draft v{draftVersionNo} · {catalog?.draftVersion?.changesCount ?? 3} changes
            </Chip>
          ) : (
            <Button variant="secondary" onClick={startDraft} disabled={createDraft.isPending}>
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
          ) : (
            <>
              {isDraft && (
                <DraftBanner catalog={catalog} draft={version} draftVersionNo={draftVersionNo} />
              )}

              {/* FIXME(mock): the 21/7/2/3/7 fallbacks are Figma values shown when the API omits them. */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatTile
                  tone="neutral"
                  value={`${version?.leadTimeDays ?? 21} d`}
                  label="Lead time"
                />
                <StatTile
                  tone="neutral"
                  value={`${version?.quarantineMinDays ?? 7} d`}
                  label="Quarantine minimum"
                />
                <StatTile
                  tone="neutral"
                  value={`${version?.arrivalBufferDays ?? 2} d`}
                  label="Arrival buffer"
                />
                <StatTile
                  tone="info"
                  value={String(version?.pinnedJobsCount ?? 3)}
                  label={`Jobs pinned to v${catalog?.activeVersion?.versionNo ?? version?.versionNo ?? 7}`}
                />
              </div>

              <RulesTable
                title={`Document rules · ${catalog?.name ?? 'Cambodia import'}`}
                rules={rules}
                selectedRuleId={rule?.id}
                onEdit={(r: RegulationRule) => setPickedRuleId(r.id)}
              />

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <RuleEditor key={rule?.id ?? 'none'} rule={rule} />
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
