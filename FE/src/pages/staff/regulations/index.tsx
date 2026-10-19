import { FC, useState, useMemo, useEffect } from 'react';
import { Input, Select, message, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Chip } from '@/components/ui/Chip';
import { Callout } from '@/components/ui/Callout';
import { StatTile } from '@/components/ui/StatTile';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  useRegulationCatalogs,
  useRegulationVersion,
  useUpdateRegulationRule,
  usePublishRegulationVersion,
  useDiscardRegulationDraft,
  useCreateRegulationDraft,
} from '@/hooks/regulation';
import type {
  RegulationCatalog,
  RegulationRule,
  RegulationRuleKind,
  RegulationVersion,
} from '@/interfaces';

interface DestinationItem {
  id: string;
  code: string;
  label: string;
  version: string;
  isCountry: boolean;
  countryCode?: string;
  hasDraft?: boolean;
}

const BORDER_CROSSINGS: DestinationItem[] = [
  { id: 'bc-1', code: 'BRD', label: 'Mộc Bài – Bavet', version: 'v2', isCountry: false },
  { id: 'bc-2', code: 'BRD', label: 'Poipet – Aranyaprathet', version: 'v3', isCountry: false },
  { id: 'bc-3', code: 'BRD', label: 'Cầu Treo – Nam Phao', version: 'v1', isCountry: false },
  { id: 'bc-4', code: 'BRD', label: 'Sadao – Bukit Kayu Hitam', version: 'v2', isCountry: false },
];

const RULE_SHAPE_OPTIONS: { kind: RegulationRuleKind; label: string }[] = [
  { kind: 'WINDOW_BEFORE_DEPARTURE', label: 'Window before departure' },
  { kind: 'VALID_THROUGH_ARRIVAL_PLUS', label: 'Valid until' },
  { kind: 'BOOSTER_WINDOW', label: 'Booster window' },
  { kind: 'PRESENCE_ONLY', label: 'Presence only' },
];

const RULE_SHAPE_LABELS: Record<RegulationRuleKind, string> = {
  WINDOW_BEFORE_DEPARTURE: 'Window before dep.',
  VALID_THROUGH_ARRIVAL_PLUS: 'Valid until',
  BOOSTER_WINDOW: 'Booster window',
  PRESENCE_ONLY: 'Presence only',
};

export const RegulationsPage: FC = () => {
  const { data: catalogs = [], isLoading: isLoadingCatalogs } = useRegulationCatalogs();
  const updateRuleMutation = useUpdateRegulationRule();
  const publishMutation = usePublishRegulationVersion();
  const discardMutation = useDiscardRegulationDraft();
  const createDraftMutation = useCreateRegulationDraft();

  // Search filter for destinations sidebar
  const [searchQuery, setSearchQuery] = useState('');

  // Selected destination
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>('KH');

  // Currently selected country catalog
  const selectedCatalog = useMemo(() => {
    return catalogs.find(
      (c) => c.countryCode === selectedDestinationId || c.id === selectedDestinationId,
    );
  }, [catalogs, selectedDestinationId]);

  // Determine active displayed version: preferentially the draft if one exists, else activeVersion
  const currentVersionId = useMemo(() => {
    if (!selectedCatalog) return null;
    return selectedCatalog.draftVersion?.id || selectedCatalog.activeVersion?.id || null;
  }, [selectedCatalog]);

  const { data: versionDetail, isLoading: isLoadingVersion } =
    useRegulationVersion(currentVersionId);

  // Selected rule for edit form
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [editKind, setEditKind] = useState<RegulationRuleKind>('WINDOW_BEFORE_DEPARTURE');
  const [editDays, setEditDays] = useState<string>('45');
  const [editAppliesTo, setEditAppliesTo] = useState<string>('PER_HORSE');
  const [editMandatory, setEditMandatory] = useState<boolean>(true);
  const [editDescription, setEditDescription] = useState<string>('');

  // Active version info
  const isDraft = versionDetail?.status === 'DRAFT';
  const hasDraft = Boolean(selectedCatalog?.draftVersion);
  const draftVersionNo =
    selectedCatalog?.draftVersion?.versionNo ??
    (selectedCatalog?.activeVersion ? selectedCatalog.activeVersion.versionNo + 1 : 8);

  // Sync selected rule on load or when rules change
  useEffect(() => {
    if (versionDetail?.rules && versionDetail.rules.length > 0) {
      // Prefer selecting EIA test if present (as in Figma), or first rule
      const eia = versionDetail.rules.find((r) => r.documentType?.code === 'EIA_TEST');
      const target = eia || versionDetail.rules[0];
      if (!selectedRuleId || !versionDetail.rules.some((r) => r.id === selectedRuleId)) {
        setSelectedRuleId(target.id);
        setEditKind(target.ruleKind);
        setEditDays(String(target.maxDays ?? target.minDays ?? 45));
        setEditAppliesTo(target.documentType?.scope ?? 'PER_HORSE');
        setEditMandatory(target.mandatory);
        setEditDescription(target.description ?? '');
      }
    }
  }, [versionDetail, selectedRuleId]);

  // Handle rule edit selection
  const handleSelectRuleForEdit = (rule: RegulationRule) => {
    setSelectedRuleId(rule.id);
    setEditKind(rule.ruleKind);
    setEditDays(String(rule.maxDays ?? rule.minDays ?? 45));
    setEditAppliesTo(rule.documentType?.scope ?? 'PER_HORSE');
    setEditMandatory(rule.mandatory);
    setEditDescription(rule.description ?? '');
  };

  // Handle save rule to draft
  const handleSaveRuleToDraft = async () => {
    if (!selectedRuleId) return;
    try {
      const parsedDays = editDays ? parseInt(editDays, 10) : undefined;
      await updateRuleMutation.mutateAsync({
        ruleId: selectedRuleId,
        data: {
          ruleKind: editKind,
          maxDays: parsedDays,
          mandatory: editMandatory,
          description: editDescription,
        },
      });
      message.success('Rule parameters updated in draft catalog');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update rule';
      message.error(msg);
    }
  };

  // Handle publish version
  const handlePublishVersion = async () => {
    const versionIdToPublish =
      selectedCatalog?.draftVersion?.id || (isDraft ? versionDetail?.id : null);
    if (!versionIdToPublish) return;
    try {
      await publishMutation.mutateAsync(versionIdToPublish);
      message.success(`Published regulation catalog v${draftVersionNo}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish version';
      message.error(msg);
    }
  };

  // Handle discard draft
  const handleDiscardDraft = async () => {
    const draftId = selectedCatalog?.draftVersion?.id || (isDraft ? versionDetail?.id : null);
    if (!draftId) return;
    try {
      await discardMutation.mutateAsync(draftId);
      message.success('Draft regulation version discarded');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to discard draft';
      message.error(msg);
    }
  };

  // Handle create draft
  const handleCreateDraft = async () => {
    if (!selectedCatalog?.id) return;
    try {
      await createDraftMutation.mutateAsync(selectedCatalog.id);
      message.success('Created new draft regulation version');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create draft';
      message.error(msg);
    }
  };

  // Build destination groups
  const destinationCountries: DestinationItem[] = useMemo(() => {
    return catalogs.map((cat) => {
      const activeNo = cat.activeVersion?.versionNo ?? 1;
      return {
        id: cat.countryCode,
        code: cat.countryCode,
        label: cat.countryCode === 'KH' ? 'Cambodia' : cat.name.replace(' import', ''),
        version: `v${activeNo}`,
        isCountry: true,
        countryCode: cat.countryCode,
        hasDraft: Boolean(cat.draftVersion),
      };
    });
  }, [catalogs]);

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return destinationCountries;
    const q = searchQuery.toLowerCase();
    return destinationCountries.filter(
      (c) => c.label.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [destinationCountries, searchQuery]);

  const filteredBorderCrossings = useMemo(() => {
    if (!searchQuery.trim()) return BORDER_CROSSINGS;
    const q = searchQuery.toLowerCase();
    return BORDER_CROSSINGS.filter(
      (b) => b.label.toLowerCase().includes(q) || b.code.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  // Selected rule object
  const currentSelectedRule = useMemo(() => {
    return versionDetail?.rules.find((r) => r.id === selectedRuleId);
  }, [versionDetail, selectedRuleId]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Regulation catalog"
        summary="Validity rules for each destination and border crossing. Publishing creates a new version; approved jobs keep the version they were pinned to."
        right={
          hasDraft ? (
            <Chip tone="warn" dot={true}>
              Draft v{draftVersionNo} · {selectedCatalog?.draftVersion?.changesCount ?? 3} changes
            </Chip>
          ) : (
            <Button
              variant="secondary"
              onClick={handleCreateDraft}
              disabled={createDraftMutation.isPending}
            >
              Create draft version
            </Button>
          )
        }
      />

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Destinations Sidebar */}
        <div className="w-full lg:w-64 shrink-0 rounded-lg border border-line bg-card p-3 flex flex-col gap-3">
          <span className="type-h4 px-1 pt-1 text-ink">Destinations</span>

          <Input
            prefix={<SearchOutlined className="text-ink-3" />}
            placeholder="Country or crossing"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-md"
            allowClear
          />

          <div className="flex flex-col gap-1">
            <span className="type-body-s px-1 text-ink-3 font-medium">Countries</span>
            {filteredCountries.map((item) => {
              const isSelected = selectedDestinationId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedDestinationId(item.id)}
                  className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-md transition-colors text-left cursor-pointer ${
                    isSelected
                      ? 'bg-sunken border border-line'
                      : 'hover:bg-sunken/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="grid h-[22px] w-[30px] place-items-center rounded border border-line-strong text-[11px] font-mono font-medium text-ink-2 shrink-0">
                      {item.code}
                    </span>
                    <span
                      className={`type-label-s truncate ${isSelected ? 'text-ink font-semibold' : 'text-ink-2'}`}
                    >
                      {item.label}
                    </span>
                  </div>
                  {item.hasDraft ? (
                    <Chip tone="warn" dot={false} className="py-0.5 px-1.5 text-[11px]">
                      Draft
                    </Chip>
                  ) : (
                    <span className="type-mono text-[11px] text-ink-3 shrink-0">
                      {item.version}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-1 pt-2 border-t border-line">
            <span className="type-body-s px-1 text-ink-3 font-medium">Border crossings</span>
            {filteredBorderCrossings.map((item) => {
              const isSelected = selectedDestinationId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedDestinationId(item.id)}
                  className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-md transition-colors text-left cursor-pointer ${
                    isSelected
                      ? 'bg-sunken border border-line'
                      : 'hover:bg-sunken/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="grid h-[22px] w-[30px] place-items-center rounded border border-line-strong text-[11px] font-mono font-medium text-ink-2 shrink-0">
                      {item.code}
                    </span>
                    <span
                      className={`type-label-s truncate ${isSelected ? 'text-ink font-semibold' : 'text-ink-2'}`}
                    >
                      {item.label}
                    </span>
                  </div>
                  <span className="type-mono text-[11px] text-ink-3 shrink-0">{item.version}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Catalog View */}
        <div className="flex-1 min-w-0 flex flex-col gap-6 w-full">
          {isLoadingCatalogs || isLoadingVersion ? (
            <div className="flex justify-center items-center py-24">
              <Spin size="large" />
            </div>
          ) : (
            <>
              {/* Draft Banner if draft version exists */}
              {isDraft && (
                <Panel className="border-warn/40 bg-card">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1 max-w-2xl">
                      <h4 className="type-h4 m-0 text-ink">
                        Draft v{versionDetail.versionNo} · {versionDetail.changesCount ?? 3} changes
                      </h4>
                      <p className="type-body-s m-0 text-ink-2">
                        Publishing makes v{versionDetail.versionNo} the rules for new jobs. The{' '}
                        {selectedCatalog?.activeVersion?.pinnedJobsCount ?? 3} jobs pinned to v
                        {selectedCatalog?.activeVersion?.versionNo ?? 7} keep v
                        {selectedCatalog?.activeVersion?.versionNo ?? 7}; 2 of them are flagged for
                        review under the new EIA window.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Button
                        variant="ghost"
                        onClick={handleDiscardDraft}
                        disabled={discardMutation.isPending}
                      >
                        Discard draft
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handlePublishVersion}
                        disabled={publishMutation.isPending}
                      >
                        Publish v{versionDetail.versionNo}
                      </Button>
                    </div>
                  </div>
                </Panel>
              )}

              {/* 4 Stat Tiles */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatTile
                  tone="neutral"
                  value={`${versionDetail?.leadTimeDays ?? 21} d`}
                  label="Lead time"
                />
                <StatTile
                  tone="neutral"
                  value={`${versionDetail?.quarantineMinDays ?? 7} d`}
                  label="Quarantine minimum"
                />
                <StatTile
                  tone="neutral"
                  value={`${versionDetail?.arrivalBufferDays ?? 2} d`}
                  label="Arrival buffer"
                />
                <StatTile
                  tone="info"
                  value={String(versionDetail?.pinnedJobsCount ?? 3)}
                  label={`Jobs pinned to v${selectedCatalog?.activeVersion?.versionNo ?? versionDetail?.versionNo ?? 7}`}
                />
              </div>

              {/* Document Rules Panel */}
              <Panel
                title={`Document rules · ${selectedCatalog?.name ?? 'Cambodia import'}`}
                extra={
                  <span className="type-body-s text-ink-3">
                    Each rule is evaluated against the job’s travel dates, never against today.
                  </span>
                }
                flush
              >
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-line bg-sunken/40">
                        <th className="py-2.5 px-6 type-label-s text-ink-3 font-medium">
                          Document
                        </th>
                        <th className="py-2.5 px-4 type-label-s text-ink-3 font-medium w-[170px]">
                          Rule shape
                        </th>
                        <th className="py-2.5 px-4 type-label-s text-ink-3 font-medium w-[180px]">
                          Parameter
                        </th>
                        <th className="py-2.5 px-4 type-label-s text-ink-3 font-medium w-[120px]">
                          Applies to
                        </th>
                        <th className="py-2.5 px-4 type-label-s text-ink-3 font-medium w-[90px]">
                          Blocks
                        </th>
                        <th className="py-2.5 px-6 type-label-s text-ink-3 font-medium text-right w-[60px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {versionDetail?.rules.map((rule) => {
                        const isSelected = rule.id === selectedRuleId;
                        const isChanged = rule.diffStatus === 'CHANGED';
                        const isNew = rule.diffStatus === 'NEW';
                        const isHighlighted = isChanged || isNew;

                        let scopeLabel = 'Per horse';
                        if (rule.documentType?.scope === 'PER_SHIPMENT')
                          scopeLabel = 'Per shipment';
                        if (rule.documentType?.scope === 'PER_CROSSING')
                          scopeLabel = 'Per crossing';

                        let blocksLabel = rule.mandatory ? 'Yes' : 'Optional';
                        if (rule.documentType?.scope === 'PER_CROSSING')
                          blocksLabel = 'Per crossing';

                        return (
                          <tr
                            key={rule.id}
                            className={`border-b border-line/70 transition-colors ${
                              isSelected
                                ? 'bg-sunken/80 border-l-2 border-l-gold'
                                : isHighlighted
                                  ? 'bg-amber-500/5 hover:bg-amber-500/10'
                                  : 'hover:bg-sunken/30'
                            }`}
                          >
                            <td className="py-3 px-6">
                              <div className="flex items-center gap-2">
                                <span className="type-label-s text-ink font-medium">
                                  {rule.documentType?.name ?? 'Document'}
                                </span>
                                {isChanged && (
                                  <Chip tone="warn" dot={false} className="py-0 px-1.5 text-[11px]">
                                    Changed
                                  </Chip>
                                )}
                                {isNew && (
                                  <Chip tone="warn" dot={false} className="py-0 px-1.5 text-[11px]">
                                    New
                                  </Chip>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Chip tone="neutral" dot={false} className="text-[12px]">
                                {RULE_SHAPE_LABELS[rule.ruleKind] ?? rule.ruleKind}
                              </Chip>
                            </td>
                            <td className="py-3 px-4">
                              <span className="type-mono text-[13px] text-ink-2">
                                {rule.parameterDisplay ?? '—'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="type-body-s text-ink-2">{scopeLabel}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="type-body-s text-ink-2">{blocksLabel}</span>
                            </td>
                            <td className="py-3 px-6 text-right">
                              <button
                                type="button"
                                onClick={() => handleSelectRuleForEdit(rule)}
                                className="type-label-s text-ink-3 hover:text-ink cursor-pointer font-medium"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Panel>

              {/* Lower 2 Panels: Edit Rule & Versions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Edit Rule Panel (2 cols) */}
                <Panel
                  title={`Edit rule · ${currentSelectedRule?.documentType?.name ?? 'EIA (Coggins) test'}`}
                  className="lg:col-span-2 flex flex-col gap-4"
                >
                  <div className="flex flex-col gap-4">
                    {/* Rule shape chips */}
                    <div className="flex flex-col gap-2">
                      <span className="type-label-s text-ink-3 font-medium">Rule shape</span>
                      <div className="flex flex-wrap gap-2">
                        {RULE_SHAPE_OPTIONS.map((opt) => {
                          const active = editKind === opt.kind;
                          return (
                            <button
                              key={opt.kind}
                              type="button"
                              onClick={() => setEditKind(opt.kind)}
                              className={`rounded-full px-3 py-1 text-xs font-mono transition-colors cursor-pointer border ${
                                active
                                  ? 'bg-blue-600/20 text-blue-300 border-blue-500 font-semibold'
                                  : 'bg-card text-ink-2 border-line hover:border-line-strong'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Parameter inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="type-label-s text-ink-3 font-medium">
                          {editKind === 'WINDOW_BEFORE_DEPARTURE'
                            ? 'Days before departure'
                            : editKind === 'VALID_THROUGH_ARRIVAL_PLUS'
                              ? 'Days after arrival'
                              : 'Days window'}
                        </label>
                        <Input
                          value={editDays}
                          onChange={(e) => setEditDays(e.target.value)}
                          placeholder="e.g. 45"
                          className="rounded-md"
                        />
                        <span className="type-body-s text-ink-3 text-[12px]">
                          {currentSelectedRule?.documentType?.code === 'EIA_TEST'
                            ? 'Was 60 in v7. Source: GDAHP notice 14/2026.'
                            : 'Evaluated against departure or arrival date.'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="type-label-s text-ink-3 font-medium">Applies to</label>
                        <Select
                          value={editAppliesTo}
                          onChange={setEditAppliesTo}
                          options={[
                            { label: 'Per horse', value: 'PER_HORSE' },
                            { label: 'Per shipment', value: 'PER_SHIPMENT' },
                            { label: 'Per crossing', value: 'PER_CROSSING' },
                          ]}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Blocks departure checkbox */}
                    <div className="pt-1">
                      <Checkbox
                        label="Blocks departure when not GREEN"
                        checked={editMandatory}
                        onChange={(e) => setEditMandatory(e.target.checked)}
                      />
                    </div>

                    {/* Re-check impact callout */}
                    <Callout tone="warn" title="Re-check impact: 2 open jobs">
                      CBRT-2026-041 and CBRT-2026-044 have Coggins tests older than 45 days at
                      departure. After publishing they are flagged for review; approved documents
                      are not revoked automatically.
                    </Callout>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (currentSelectedRule) handleSelectRuleForEdit(currentSelectedRule);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={handleSaveRuleToDraft}
                        disabled={updateRuleMutation.isPending}
                      >
                        Save to draft
                      </Button>
                    </div>
                  </div>
                </Panel>

                {/* Versions Panel (1 col) */}
                <Panel
                  title={`Versions · ${selectedCatalog?.name?.replace(' import', '') ?? 'Cambodia'}`}
                >
                  <div className="flex flex-col divide-y divide-line">
                    {/* v8 Draft */}
                    {selectedCatalog?.draftVersion && (
                      <div className="py-3 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="type-mono font-bold text-ink">
                            v{selectedCatalog.draftVersion.versionNo}
                          </span>
                          <Chip tone="warn" dot={false} className="py-0 px-1.5 text-[11px]">
                            Draft
                          </Chip>
                        </div>
                        <span className="type-body-s text-ink-3">
                          {selectedCatalog.draftVersion.changesCount ?? 3} changes · edited by
                          Nguyễn Thị Lan today, 10:40
                        </span>
                      </div>
                    )}

                    {/* v7 Current */}
                    {selectedCatalog?.activeVersion && (
                      <div className="py-3 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="type-mono font-bold text-ink">
                            v{selectedCatalog.activeVersion.versionNo}
                          </span>
                          <Chip tone="info" dot={false} className="py-0 px-1.5 text-[11px]">
                            Current
                          </Chip>
                        </div>
                        <span className="type-body-s text-ink-3">
                          Published 22 Sep 2026 ·{' '}
                          {selectedCatalog.activeVersion.pinnedJobsCount ?? 3} jobs pinned
                        </span>
                      </div>
                    )}

                    {/* Other versions */}
                    {selectedCatalog?.versions
                      ?.filter(
                        (v) =>
                          v.id !== selectedCatalog.activeVersion?.id &&
                          v.id !== selectedCatalog.draftVersion?.id,
                      )
                      .map((v) => (
                        <div key={v.id} className="py-3 flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="type-mono font-medium text-ink-2">v{v.versionNo}</span>
                          </div>
                          <span className="type-body-s text-ink-3">
                            {`Published ${v.publishedAt ? new Date(v.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'earlier'}${v.pinnedJobsCount ? ` · ${v.pinnedJobsCount} jobs pinned` : ' · archived'}`}
                          </span>
                        </div>
                      ))}
                  </div>
                </Panel>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegulationsPage;
