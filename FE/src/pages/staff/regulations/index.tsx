import { type FC, useState } from 'react';
import { App, Col, Flex, Row, Skeleton } from 'antd';
import PageHeader from '@/components/PageHeader';
import { Button, Chip, Panel, StatTile } from '@/components/ui';
import {
  useCreateRegulationDraft,
  useRegulationCountries,
  useRegulationVersion,
  useRemoveRegulationRule,
} from '@/hooks/regulation';
import { CatalogStatusEnum, type RegulationRule } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';
import { AddCountryModal } from './AddCountryModal';
import { AddRuleModal } from './AddRuleModal';
import { changesLabel, defaultRule, type DestinationItem } from './constants';
import DestinationList from './DestinationList';
import DraftBanner from './DraftBanner';
import { NoCatalogPanel } from './NoCatalogPanel';
import { ParametersModal } from './ParametersModal';
import RuleEditor from './RuleEditor';
import RulesTable from './RulesTable';
import VersionsPanel from './VersionsPanel';

/** "21 d", or a dash while the version hasn't loaded. */
const days = (value?: number) => (value === undefined || value === null ? '—' : `${value} d`);

type Dialog = 'country' | 'catalog' | 'parameters' | 'rule' | null;

/**
 * The transport specialist's regulation catalog: pick a country, read its rules, edit them in a draft and
 * publish. A new country is added here and gets its catalog here too (US-F2-12). Approved jobs keep the
 * version they were pinned to.
 */
export const RegulationsPage: FC = () => {
  const { message, modal } = App.useApp();
  const { data: countries = [], isPending: loadingCountries } = useRegulationCountries();
  const createDraft = useCreateRegulationDraft();
  const removeRule = useRemoveRegulationRule();
  const [dialog, setDialog] = useState<Dialog>(null);

  const [pickedCode, setPickedCode] = useState<string | null>(null);
  const country = countries.find((c) => c.code === pickedCode) ?? countries[0];
  const catalog = country?.catalog ?? null;
  const active = catalog?.activeVersion;
  // A country opens on its draft when it has one, else on the published version.
  const versionId = catalog?.draftVersion?.id || active?.id || null;
  const { data: version, isPending: loadingVersion } = useRegulationVersion(versionId);

  const rules = version?.rules ?? [];
  const [pickedRuleId, setPickedRuleId] = useState<string | null>(null);
  const rule = rules.find((r) => r.id === pickedRuleId) ?? defaultRule(rules);
  const isDraft = version?.status === CatalogStatusEnum.DRAFT;

  const destinations: DestinationItem[] = countries.map((c) => ({
    id: c.code,
    code: c.code,
    label: c.name,
    version: c.catalog
      ? c.catalog.activeVersion
        ? `v${c.catalog.activeVersion.versionNo}`
        : '—'
      : null,
    hasDraft: Boolean(c.catalog?.draftVersion),
  }));

  const startDraft = async () => {
    if (!catalog) return;
    try {
      const draft = await createDraft.mutateAsync(catalog.id);
      message.success(`Draft v${draft.versionNo} created`);
    } catch (err: unknown) {
      message.error(apiErrorMessage(err, "The draft wasn't created. Try again."));
    }
  };

  const confirmRemove = (r: RegulationRule) =>
    modal.confirm({
      title: `Remove the ${r.documentType?.name ?? 'document'} rule from the draft?`,
      content: active
        ? `It stays in the published v${active.versionNo} until the draft is published.`
        : 'Jobs won’t be asked for this document once the catalog is published.',
      okText: 'Remove',
      okButtonProps: { danger: true },
      cancelText: 'Keep it',
      onOk: async () => {
        try {
          await removeRule.mutateAsync(r.id);
          message.success('Rule removed from the draft');
        } catch (err: unknown) {
          message.error(apiErrorMessage(err, "The rule wasn't removed. Try again."));
        }
      },
    });

  const selectCountry = (code: string) => {
    setPickedCode(code);
    setPickedRuleId(null);
  };

  // The tiles, rules and versions of the catalog on screen, once its version has loaded.
  const catalogBody = () => {
    if (!catalog || !version) return null;
    return (
      <>
        {isDraft && (
          <DraftBanner
            country={country}
            draft={version}
            onEditParameters={() => setDialog('parameters')}
          />
        )}

        <Row gutter={[16, 16]}>
          <Col xs={12} md={6}>
            <StatTile
              tone="neutral"
              value={days(version.leadTimeDays)}
              label={`Lead time · ${days(version.domesticLeadTimeDays)} domestic`}
            />
          </Col>
          <Col xs={12} md={6}>
            <StatTile
              tone="neutral"
              value={days(version.quarantineMinDays)}
              label="Quarantine minimum"
            />
          </Col>
          <Col xs={12} md={6}>
            <StatTile
              tone="neutral"
              value={days(version.arrivalBufferDays)}
              label="Arrival buffer"
            />
          </Col>
          <Col xs={12} md={6}>
            <StatTile
              tone="info"
              value={String(active?.pinnedJobsCount ?? 0)}
              label={active ? `Jobs pinned to v${active.versionNo}` : 'Jobs pinned'}
            />
          </Col>
        </Row>

        <RulesTable
          title={`Document rules · ${catalog.name}`}
          rules={rules}
          selectedRuleId={rule?.id}
          editable={isDraft}
          onEdit={(r: RegulationRule) => setPickedRuleId(r.id)}
          onAdd={() => setDialog('rule')}
          onRemove={confirmRemove}
        />

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <RuleEditor rule={rule} editable={isDraft} />
          </Col>
          <Col xs={24} lg={8}>
            <VersionsPanel catalog={catalog} />
          </Col>
        </Row>
      </>
    );
  };

  const loading = (
    <Panel>
      <Skeleton active title={false} paragraph={{ rows: 6 }} />
    </Panel>
  );

  return (
    <Flex vertical gap={28}>
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
            catalog && (
              <Button variant="secondary" onClick={startDraft} disabled={createDraft.isPending}>
                Create draft version
              </Button>
            )
          )
        }
      />

      <Row gutter={[24, 24]} align="top">
        <Col xs={24} lg={7} xl={6}>
          {loadingCountries ? (
            loading
          ) : (
            <DestinationList
              countries={destinations}
              selectedId={country?.code ?? ''}
              onSelect={selectCountry}
              onAdd={() => setDialog('country')}
            />
          )}
        </Col>

        <Col xs={24} lg={17} xl={18}>
          <Flex vertical gap={24}>
            {loadingCountries || (versionId && loadingVersion) ? (
              loading
            ) : !country ? (
              <Panel title="No countries yet">
                <p className="type-body-m m-0 text-ink-2">
                  Add the first country we serve to start its regulation catalog.
                </p>
              </Panel>
            ) : !catalog ? (
              <NoCatalogPanel country={country} onCreate={() => setDialog('catalog')} />
            ) : !version ? (
              <Panel title={`${country.name} · no version`}>
                <p className="type-body-m m-0 text-ink-2">
                  This catalog has no version yet. Create a draft version to start its rules.
                </p>
              </Panel>
            ) : (
              catalogBody()
            )}
          </Flex>
        </Col>
      </Row>

      <AddCountryModal
        open={dialog === 'country'}
        onClose={() => setDialog(null)}
        onAdded={(added) => selectCountry(added.code)}
      />
      {country && !catalog && (
        <ParametersModal
          open={dialog === 'catalog'}
          onClose={() => setDialog(null)}
          country={country}
        />
      )}
      {isDraft && version && (
        <>
          <ParametersModal
            open={dialog === 'parameters'}
            onClose={() => setDialog(null)}
            draft={version}
          />
          <AddRuleModal open={dialog === 'rule'} onClose={() => setDialog(null)} draft={version} />
        </>
      )}
    </Flex>
  );
};

export default RegulationsPage;
