import { FC, useState, useMemo } from 'react';
import { Input, Modal, Form, InputNumber, message, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Chip } from '@/components/ui/Chip';
import { Callout } from '@/components/ui/Callout';
import { StatTile } from '@/components/ui/StatTile';
import {
  useRateCorridors,
  useRateCatalogDetails,
  useCreateRateDraft,
  useDiscardRateDraft,
  usePublishRateDraft,
  useUpdateVolumeBreak,
  useUpdateServiceClass,
} from '@/hooks/rate';
import type { RateServiceClass, RateVolumeBreak } from '@/interfaces';

export const RatesPage: FC = () => {
  const { data: corridors = [], isLoading: isLoadingCorridors } = useRateCorridors();
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-select first air corridor (e.g. PNH -> HKG) on initial load
  const activeCorridor = useMemo(() => {
    if (!corridors.length) return null;
    if (selectedCorridorId) {
      return corridors.find((c) => c.id === selectedCorridorId) ?? corridors[0];
    }
    const preferred =
      corridors.find((c) => c.code.includes('PNH') && c.mode === 'AIR') ?? corridors[0];
    return preferred;
  }, [corridors, selectedCorridorId]);

  const activeCorridorId = activeCorridor?.id;

  const { data: catalogDetail, isLoading: isLoadingDetail } = useRateCatalogDetails(
    activeCorridorId || undefined,
  );

  const createDraftMutation = useCreateRateDraft();
  const discardDraftMutation = useDiscardRateDraft();
  const publishDraftMutation = usePublishRateDraft();
  const updateVolumeBreakMutation = useUpdateVolumeBreak();
  const updateServiceClassMutation = useUpdateServiceClass();

  // Modals for editing in draft mode
  const [editingVolumeBreak, setEditingVolumeBreak] = useState<RateVolumeBreak | null>(null);
  const [vbForm] = Form.useForm<{ discountPct: number }>();

  const [editingServiceClass, setEditingServiceClass] = useState<RateServiceClass | null>(null);
  const [scForm] = Form.useForm<{ positionRate: number }>();

  const isDraft = catalogDetail?.status === 'DRAFT';
  const hasDraft = Boolean(catalogDetail?.hasDraft || isDraft);
  const draftVersionNo = catalogDetail?.draftVersionNo ?? 13;
  const draftChanges = catalogDetail?.draftChangesSummary ?? '1 change';
  const draftVersionId =
    catalogDetail?.draftVersionId ?? (isDraft ? catalogDetail?.versionId : undefined);

  // Group corridors into Air and Road
  const filteredCorridors = useMemo(() => {
    if (!searchQuery.trim()) return corridors;
    const q = searchQuery.toLowerCase();
    return corridors.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.originCity.toLowerCase().includes(q) ||
        c.destinationCity.toLowerCase().includes(q),
    );
  }, [corridors, searchQuery]);

  const airCorridors = useMemo(
    () => filteredCorridors.filter((c) => c.mode === 'AIR'),
    [filteredCorridors],
  );

  const roadCorridors = useMemo(
    () => filteredCorridors.filter((c) => c.mode === 'ROAD'),
    [filteredCorridors],
  );

  const handleCreateDraft = async () => {
    try {
      await createDraftMutation.mutateAsync();
      message.success('Draft rate catalog version created');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create draft version';
      message.error(msg);
    }
  };

  const handleDiscardDraft = async () => {
    if (!draftVersionId) return;
    try {
      await discardDraftMutation.mutateAsync(draftVersionId);
      message.success('Draft rate catalog version discarded');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to discard draft';
      message.error(msg);
    }
  };

  const handlePublishDraft = async () => {
    if (!draftVersionId) return;
    try {
      await publishDraftMutation.mutateAsync(draftVersionId);
      message.success(`Published rate catalog v${draftVersionNo}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish version';
      message.error(msg);
    }
  };

  const handleSaveVolumeBreak = async () => {
    if (!editingVolumeBreak) return;
    try {
      const values = await vbForm.validateFields();
      await updateVolumeBreakMutation.mutateAsync({
        breakId: editingVolumeBreak.id,
        data: { discountPct: values.discountPct },
      });
      message.success(`Volume break ${editingVolumeBreak.label} updated to ${values.discountPct}%`);
      setEditingVolumeBreak(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update volume break';
      message.error(msg);
    }
  };

  const handleSaveServiceClass = async () => {
    if (!editingServiceClass) return;
    try {
      const values = await scForm.validateFields();
      await updateServiceClassMutation.mutateAsync({
        classId: editingServiceClass.id,
        data: { positionRate: values.positionRate },
      });
      message.success(
        `Service class ${editingServiceClass.serviceClassName} rate updated to $${values.positionRate.toLocaleString()}`,
      );
      setEditingServiceClass(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update service class';
      message.error(msg);
    }
  };

  // Missing rate callout trigger
  const showMissingRateCallout =
    activeCorridor?.missingRatesCount && activeCorridor.missingRatesCount > 0
      ? true
      : corridors.some((c) => c.missingRatesCount > 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rate catalog"
        summary="Rates for each corridor and service class. A quotation pins the version it was built from, so later changes never alter an issued quote."
        right={
          hasDraft ? (
            <Chip tone="warn" dot={true}>
              Draft v{draftVersionNo} · {draftChanges}
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
        {/* Left Corridors Sidebar (sideList) */}
        <div className="w-full lg:w-64 shrink-0 rounded-lg border border-line bg-card p-3 flex flex-col gap-3">
          <span className="type-h4 px-1 pt-1 text-ink">Corridors</span>

          <Input
            prefix={<SearchOutlined className="text-ink-3" />}
            placeholder="Search corridors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-md"
            allowClear
          />

          {/* Air Corridors */}
          <div className="flex flex-col gap-1">
            <span className="type-body-s px-1 text-ink-3 font-medium">Air</span>
            {airCorridors.map((c) => {
              const isSelected = activeCorridor?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCorridorId(c.id)}
                  className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-md transition-colors text-left cursor-pointer ${
                    isSelected
                      ? 'bg-sunken border border-line'
                      : 'hover:bg-sunken/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="grid h-[22px] w-[34px] place-items-center rounded border border-line-strong text-[11px] font-mono font-medium text-ink-2 shrink-0">
                      AIR
                    </span>
                    <span
                      className={`type-label-s truncate ${
                        isSelected ? 'text-ink font-semibold' : 'text-ink-2'
                      }`}
                    >
                      {c.label}
                    </span>
                  </div>
                  {c.hasDraft ? (
                    <Chip tone="warn" dot={false} className="py-0.5 px-1.5 text-[11px]">
                      Draft
                    </Chip>
                  ) : (
                    <span className="type-mono text-[11px] text-ink-3 shrink-0">{c.version}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Road Corridors */}
          <div className="flex flex-col gap-1 pt-2 border-t border-line">
            <span className="type-body-s px-1 text-ink-3 font-medium">Road</span>
            {roadCorridors.map((c) => {
              const isSelected = activeCorridor?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCorridorId(c.id)}
                  className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-md transition-colors text-left cursor-pointer ${
                    isSelected
                      ? 'bg-sunken border border-line'
                      : 'hover:bg-sunken/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="grid h-[22px] w-[34px] place-items-center rounded border border-line-strong text-[11px] font-mono font-medium text-ink-2 shrink-0">
                      RD
                    </span>
                    <span
                      className={`type-label-s truncate ${
                        isSelected ? 'text-ink font-semibold' : 'text-ink-2'
                      }`}
                    >
                      {c.label}
                    </span>
                  </div>
                  {c.missingRatesCount > 0 ? (
                    <Chip tone="bad" dot={false} className="py-0.5 px-1.5 text-[11px]">
                      {c.missingRatesCount} missing
                    </Chip>
                  ) : (
                    <span className="type-mono text-[11px] text-ink-3 shrink-0">{c.version}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Column */}
        <div className="flex-1 min-w-0 flex flex-col gap-6 w-full">
          {isLoadingCorridors || isLoadingDetail ? (
            <div className="flex justify-center items-center py-24">
              <Spin size="large" />
            </div>
          ) : (
            <>
              {/* Draft Panel Banner */}
              {isDraft && (
                <Panel className="border-warn/40 bg-card">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1 max-w-2xl">
                      <h4 className="type-h4 m-0 text-ink">
                        Draft v{catalogDetail?.versionNo ?? draftVersionNo} · {draftChanges}
                      </h4>
                      <p className="type-body-s m-0 text-ink-2">
                        Publishing makes v{catalogDetail?.versionNo ?? draftVersionNo} the rates for
                        new quotations. The {catalogDetail?.quotesPinnedCount ?? 4} quotations
                        pinned to v{Number(catalogDetail?.versionNo ?? draftVersionNo) - 1} keep
                        their prices.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Button
                        variant="ghost"
                        onClick={handleDiscardDraft}
                        disabled={discardDraftMutation.isPending}
                      >
                        Discard draft
                      </Button>
                      <Button
                        variant="primary"
                        leadingIcon="upload"
                        onClick={handlePublishDraft}
                        disabled={publishDraftMutation.isPending}
                      >
                        Publish v{catalogDetail?.versionNo ?? draftVersionNo}
                      </Button>
                    </div>
                  </div>
                </Panel>
              )}

              {/* 4 Stat Tiles */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatTile
                  tone="neutral"
                  value={`${catalogDetail?.corridor?.distanceKm?.toLocaleString() ?? '1,510'} km`}
                  label="Distance"
                />
                <StatTile
                  tone="neutral"
                  value={String(catalogDetail?.corridor?.borderCrossingCount ?? 1)}
                  label="Border crossings"
                />
                <StatTile
                  tone="info"
                  value={String(catalogDetail?.quotesPinnedCount ?? 4)}
                  label={`Quotes pinned to v${Number(catalogDetail?.versionNo ?? 13) - 1}`}
                />
                <StatTile
                  tone="neutral"
                  value={catalogDetail?.publishedAtDisplay ?? '23 Sep'}
                  label="Last published"
                />
              </div>

              {/* Missing Rates Callout */}
              {showMissingRateCallout && (
                <Callout tone="bad" title="HAN → VTE has 2 missing rates">
                  Quotations on that corridor cannot be issued until the road rate and the Cầu Treo
                  crossing fee are filled in.
                </Callout>
              )}

              {/* Service Classes Table */}
              <Panel
                title={`Air stall by service class · ${
                  catalogDetail?.corridor?.label ?? activeCorridor?.label ?? 'PNH → HKG'
                }`}
                extra={
                  <span className="type-body-s text-ink-3">
                    Class sets the width per horse. A size L horse cannot fly Economy; a mare with
                    foal needs First.
                  </span>
                }
                flush
              >
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-line bg-sunken/40">
                        <th className="py-2.5 px-6 type-label-s text-ink-3 font-medium">Class</th>
                        <th className="py-2.5 px-4 type-label-s text-ink-3 font-medium w-[140px]">
                          Width per horse
                        </th>
                        <th className="py-2.5 px-4 type-label-s text-ink-3 font-medium text-right w-[180px]">
                          Horses per position
                        </th>
                        <th className="py-2.5 px-4 type-label-s text-ink-3 font-medium text-right w-[130px]">
                          Position rate
                        </th>
                        <th className="py-2.5 px-6 type-label-s text-ink-3 font-medium text-right w-[130px]">
                          Per horse
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {catalogDetail?.serviceClasses.map((sc) => (
                        <tr
                          key={sc.id}
                          onClick={() => {
                            if (isDraft) {
                              setEditingServiceClass(sc);
                              scForm.setFieldsValue({ positionRate: sc.positionRate });
                            }
                          }}
                          className={`border-b border-line/70 transition-colors ${
                            isDraft ? 'hover:bg-sunken/40 cursor-pointer' : 'hover:bg-sunken/20'
                          }`}
                        >
                          <td className="py-3 px-6">
                            <span className="type-label-s text-ink font-medium">
                              {sc.serviceClassName}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="type-mono text-[13px] text-ink">
                              {sc.widthPerHorseIn} in
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="type-mono text-[13px] text-ink">
                              {sc.horsesPerPosition}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="type-mono text-[13px] text-ink font-medium">
                              ${sc.positionRate.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-right">
                            <span className="type-mono text-[13px] text-ink font-semibold">
                              ${sc.perHorseRate.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              {/* 2-Column Split: Volume Breaks & Policy */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Volume Breaks */}
                <Panel
                  title="Volume breaks"
                  extra={
                    <span className="type-body-s text-ink-3">Applied to air and ground lines.</span>
                  }
                  flush
                >
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-line bg-sunken/40">
                          <th className="py-2.5 px-6 type-label-s text-ink-3 font-medium">
                            Horses
                          </th>
                          <th className="py-2.5 px-6 type-label-s text-ink-3 font-medium text-right w-[170px]">
                            Discount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {catalogDetail?.volumeBreaks.map((vb) => {
                          const isHl = vb.highlighted;
                          return (
                            <tr
                              key={vb.id}
                              onClick={() => {
                                if (isDraft) {
                                  setEditingVolumeBreak(vb);
                                  vbForm.setFieldsValue({ discountPct: vb.discountPct });
                                }
                              }}
                              className={`border-b border-line/70 transition-colors ${
                                isHl
                                  ? 'bg-amber-500/10 hover:bg-amber-500/15'
                                  : 'hover:bg-sunken/30'
                              } ${isDraft ? 'cursor-pointer' : ''}`}
                            >
                              <td className="py-3 px-6">
                                <div className="flex items-center gap-2">
                                  <span className="type-mono text-[13px] text-ink font-medium">
                                    {vb.label}
                                  </span>
                                  {vb.previousValue && (
                                    <Chip
                                      tone="warn"
                                      dot={false}
                                      className="py-0 px-1.5 text-[11px]"
                                    >
                                      {vb.previousValue}
                                    </Chip>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-6 text-right">
                                <span className="type-mono text-[13px] text-ink font-semibold">
                                  {vb.discountPct}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Panel>

                {/* Percentages and Policy */}
                <Panel title="Percentages and policy">
                  <div className="flex flex-col gap-2.5">
                    {catalogDetail?.policies.map((p, idx) => (
                      <div
                        key={p.key || idx}
                        className="flex items-center justify-between py-1.5 border-b border-line/60 last:border-b-0"
                      >
                        <span className="type-body-s text-ink-2">{p.label}</span>
                        <span className="type-mono text-[13px] text-ink">{p.valueDisplay}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>

              {/* Catalog Lines Table */}
              <Panel
                title="Catalog lines"
                extra={
                  <span className="type-body-s text-ink-3">
                    Quantities are derived from the request. Estimated lines are marked on the
                    quotation.
                  </span>
                }
                flush
              >
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-line bg-sunken/40">
                        <th className="py-2.5 px-6 type-label-s text-ink-3 font-medium">Line</th>
                        <th className="py-2.5 px-4 type-label-s text-ink-3 font-medium w-[200px]">
                          Basis
                        </th>
                        <th className="py-2.5 px-4 type-label-s text-ink-3 font-medium text-right w-[110px]">
                          Rate
                        </th>
                        <th className="py-2.5 px-6 type-label-s text-ink-3 font-medium text-right w-[110px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {catalogDetail?.catalogLines.map((line) => {
                        const isEstimated = line.certainty === 'ESTIMATED';
                        return (
                          <tr
                            key={line.id}
                            className="border-b border-line/70 hover:bg-sunken/30 transition-colors"
                          >
                            <td className="py-3 px-6">
                              <span className="type-label-s text-ink font-medium">
                                {line.description}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="type-mono text-[12px] text-ink-3">
                                {line.basisDisplay}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="type-mono text-[13px] text-ink font-semibold">
                                ${line.rate.toLocaleString()}
                              </span>
                            </td>
                            <td className="py-3 px-6 text-right">
                              <Chip
                                tone={isEstimated ? 'warn' : 'neutral'}
                                dot={false}
                                className="text-[11px]"
                              >
                                {isEstimated ? 'Estimated' : 'Fixed'}
                              </Chip>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </>
          )}
        </div>
      </div>

      {/* Edit Volume Break Modal */}
      <Modal
        title={`Edit volume break · ${editingVolumeBreak?.label} horses`}
        open={Boolean(editingVolumeBreak)}
        onCancel={() => setEditingVolumeBreak(null)}
        onOk={handleSaveVolumeBreak}
        confirmLoading={updateVolumeBreakMutation.isPending}
        okText="Save discount"
      >
        <Form form={vbForm} layout="vertical" className="pt-4">
          <Form.Item
            name="discountPct"
            label="Discount percentage (%)"
            rules={[
              { required: true, message: 'Please enter a discount percentage' },
              { type: 'number', min: 0, max: 100, message: 'Must be between 0 and 100' },
            ]}
          >
            <InputNumber className="w-full" min={0} max={100} step={0.5} addonAfter="%" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Service Class Modal */}
      <Modal
        title={`Edit position rate · ${editingServiceClass?.serviceClassName}`}
        open={Boolean(editingServiceClass)}
        onCancel={() => setEditingServiceClass(null)}
        onOk={handleSaveServiceClass}
        confirmLoading={updateServiceClassMutation.isPending}
        okText="Save position rate"
      >
        <Form form={scForm} layout="vertical" className="pt-4">
          <Form.Item
            name="positionRate"
            label="Position rate ($ USD)"
            rules={[
              { required: true, message: 'Please enter a position rate' },
              { type: 'number', min: 1, message: 'Must be greater than 0' },
            ]}
          >
            <InputNumber className="w-full" min={1} step={100} prefix="$" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RatesPage;
