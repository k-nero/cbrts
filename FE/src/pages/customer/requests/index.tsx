import { useState, useMemo, useEffect, type FC, type ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Modal, message, Alert, Input } from 'antd';
import PageHeader from '@/components/PageHeader';
import {
  Button,
  Chip,
  Panel,
  Icon,
  Perforation,
  StageMark,
  OwedItem,
  COAT_SWATCH,
  TONE_FG,
  cx,
  type Stage,
  type Tone,
} from '@/components/ui';
import { useCustomerHome } from '@/hooks/home';
import { fileApi } from '@/apis/file';
import type { MoveEntry } from '@/interfaces';

const STAGES = ['Request', 'Quotation', 'Approval', 'Documents', 'Clearance', 'Trip', 'Handover'] as const;

export const MyRequestsPage: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCode = searchParams.get('code');

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [selectedCode]);

  const { data: home, isPending } = useCustomerHome();

  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedOwedItem, setSelectedOwedItem] = useState<{ id: string; title: string; subject: string; reason: string } | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [issuedOn, setIssuedOn] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [issuer, setIssuer] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submittedOwedIds, setSubmittedOwedIds] = useState<Record<string, { fileName: string; fileId: string }>>({});

  // Filtered moves
  const activeMoves = useMemo(() => {
    if (!home?.moves) return [];
    if (!searchQuery.trim()) return home.moves;
    const q = searchQuery.toLowerCase();
    return home.moves.filter(
      (m) =>
        m.requestCode.toLowerCase().includes(q) ||
        m.route.toLowerCase().includes(q) ||
        m.detail.toLowerCase().includes(q),
    );
  }, [home?.moves, searchQuery]);

  const selectedMove: MoveEntry | undefined = useMemo(() => {
    if (!home?.moves || !selectedCode) return undefined;
    return home.moves.find((m) => m.requestCode === selectedCode);
  }, [home?.moves, selectedCode]);

  const handleOpenUpload = (item: { id: string; title: string; subject: string; reason: string }) => {
    setSelectedOwedItem(item);
    setUploadFile(null);
    setIssuedOn('');
    setValidUntil('');
    setIssuer('');
    setUploadError(null);
    setUploadModalOpen(true);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedOwedItem) return;
    if (!uploadFile) {
      setUploadError('Please select a PDF or image file from your computer.');
      return;
    }
    if (!issuedOn.trim() || !validUntil.trim()) {
      setUploadError('Issue date and expiry date are strictly required (US-F2-03).');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    if (validUntil.trim() < today) {
      setUploadError('This certificate is expired. Expired certificates cannot be accepted (US-F2-09).');
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      const uploaded = await fileApi.upload(uploadFile);
      setSubmittedOwedIds((prev) => ({
        ...prev,
        [selectedOwedItem.id]: { fileName: uploadFile.name, fileId: uploaded.id },
      }));
      message.success(`Uploaded ${uploadFile.name} successfully! Submitted for clearance review.`);
      setUploadModalOpen(false);
      setSelectedOwedItem(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload document. Please try again.';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  if (isPending || !home) {
    return (
      <div className="flex h-64 items-center justify-center text-ink-tertiary">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        <span className="ml-3 type-body-m">Loading requests...</span>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: MOVE TRACKING DETAIL VIEW (when selectedCode is active)
  // =========================================================================
  if (selectedMove) {
    const isJob041 = selectedMove.requestCode === 'REQ-2026-0162';

    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
        {/* Back Link */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            leadingIcon="arrow-left"
            onClick={() => {
              window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
              setSearchParams({});
            }}
            className="text-ink-secondary hover:text-ink"
          >
            My requests
          </Button>
        </div>

        {/* Travel Pass Header */}
        <section className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
          <div className="flex flex-col md:flex-row items-stretch">
            {/* Main Pass Area */}
            <div className="flex flex-1 flex-col gap-5 p-6 md:p-7">
              {/* Top Row: Codes & Stage Chip */}
              <div className="flex items-center justify-between gap-4">
                <div className="type-mono-caption flex items-center gap-2 text-ink-secondary">
                  <span className="text-ink font-semibold">{selectedMove.requestCode}</span>
                  <span>·</span>
                  <span>{selectedMove.detail.split('·')[0].trim()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StageMark stage={selectedMove.stage} />
                  <Chip tone={selectedMove.holds.tone}>
                    {selectedMove.holds.text.includes('locked') ? 'Departure locked' : selectedMove.holds.text}
                  </Chip>
                </div>
              </div>

              {/* Title Route */}
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="type-mono-caption text-ink-tertiary">SGN</span>
                  <span className="type-display-m font-serif text-ink">
                    {selectedMove.route.split('→')[0].trim()}
                  </span>
                </div>
                <div className="flex flex-1 items-center gap-2 px-2">
                  <div className="h-px flex-1 bg-line-strong" />
                  <Icon
                    name={selectedMove.detail.includes('air') ? 'plane' : 'truck'}
                    size={20}
                    className="text-ink-secondary"
                  />
                  <div className="h-px flex-1 bg-line-strong" />
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="type-mono-caption text-ink-tertiary">PNH</span>
                  <span className="type-display-m font-serif text-ink">
                    {selectedMove.route.split('→')[1]?.trim()}
                  </span>
                </div>
              </div>

              {/* Facts Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-line pt-4 text-sm">
                <div>
                  <div className="type-caption text-ink-tertiary">Departure</div>
                  <div className="type-label-s text-ink font-medium mt-0.5">
                    {selectedMove.departsAt ? new Date(selectedMove.departsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '18 Oct 2026'}
                  </div>
                </div>
                <div>
                  <div className="type-caption text-ink-tertiary">Transport mode</div>
                  <div className="type-label-s text-ink font-medium mt-0.5">
                    {selectedMove.detail.includes('air') ? 'Air · Business class' : 'Road · Private trailer'}
                  </div>
                </div>
                <div>
                  <div className="type-caption text-ink-tertiary">Horses on board</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {home.horses.slice(0, 4).map((h) => (
                        <span
                          key={h.id}
                          className={cx(
                            'inline-block h-3.5 w-3.5 rounded-full ring-2 ring-card',
                            COAT_SWATCH[h.coat],
                          )}
                        />
                      ))}
                    </div>
                    <span className="type-mono-data text-ink text-xs font-medium ml-1">
                      {isJob041 ? '4 horses' : '2 horses'}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="type-caption text-ink-tertiary">Clearance status</div>
                  <div className="type-label-s text-warn-fg font-medium mt-0.5">
                    {selectedMove.holds.tone === 'ok' ? 'Clear to depart' : 'Dossier in review'}
                  </div>
                </div>
              </div>
            </div>

            {/* Perforation Divider */}
            <div className="hidden md:flex flex-col justify-center">
              <Perforation direction="vertical" inset={8} gap={6} />
            </div>

            {/* Stub */}
            <div className="flex w-full md:w-60 flex-col justify-center bg-sunken p-6 border-t md:border-t-0 md:border-l border-line text-left md:text-center">
              <span className="type-body-s text-ink-secondary">Departs in</span>
              <span className="type-display-s font-serif text-ink mt-1 font-bold">22 days</span>
              <span className="type-mono-caption text-ink-tertiary mt-1">18 Oct 2026 · 06:00</span>
            </div>
          </div>
        </section>

        {/* Lead Owed Section */}
        {isJob041 && (
          <Panel
            flush
            title="You owe 4 items"
            extra={
              <div className="flex flex-col items-end gap-1">
                <span className="type-label-s text-ink-secondary">14 of 23 documents cleared</span>
                <div className="h-1.5 w-44 rounded-full bg-sunken overflow-hidden">
                  <div className="h-full bg-ok w-[60%]" />
                </div>
              </div>
            }
          >
            <div className="divide-y divide-line">
              {home.owed.map((item, idx) => {
                const submitted = submittedOwedIds[item.id];
                return (
                  <OwedItem
                    key={item.id}
                    urgency={submitted ? 'done' : item.urgency}
                    title={submitted ? `${item.title} (Submitted)` : item.title}
                    subject={item.subject}
                    reason={
                      submitted
                        ? `Uploaded file: ${submitted.fileName} · Pending review by Transport Specialist`
                        : item.reason
                    }
                    deadline={{
                      left: submitted ? 'In review' : item.urgency === 'overdue' ? 'Overdue by 1 day' : 'Due in 4 days',
                      date: submitted ? 'Submitted just now' : '30 Sep 2026',
                    }}
                    action={
                      submitted ? (
                        <Chip tone="ok">Submitted ✓</Chip>
                      ) : (
                        <Button
                          size="sm"
                          variant={idx === 0 ? 'primary' : 'secondary'}
                          leadingIcon="upload"
                          onClick={() => handleOpenUpload(item)}
                        >
                          {item.action.label}
                        </Button>
                      )
                    }
                  />
                );
              })}
            </div>
          </Panel>
        )}

        {/* 2-Column Split: Progress / People & Route */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column (Where it stands & Who is on your move) */}
          <div className="flex flex-col gap-6 lg:col-span-7">
            {/* Where it stands */}
            <Panel title="Where it stands" flush>
              <div className="divide-y divide-line p-5">
                {[
                  { stage: 'Request', state: 'done', detail: 'You submitted the request with 4 horses.', date: '2 Sep' },
                  { stage: 'Quotation', state: 'done', detail: 'Quotation v2 accepted; deposit paid.', date: '10 Sep' },
                  { stage: 'Approval', state: 'done', detail: 'Approved by Yến, logistics manager. Job CBRT-2026-041.', date: '12 Sep' },
                  { stage: 'Documents', state: 'current', detail: 'You upload; Lan, transport specialist, checks each document.', date: 'Due in 15 days · 11 Oct' },
                  { stage: 'Clearance', state: 'blocked', detail: 'Lan files the border dossiers once documents are cleared. Departure stays locked until then.', date: 'Expected 14 Oct' },
                  { stage: 'Trip', state: 'upcoming', detail: 'Minh, driver, with two grooms. Pickup 06:00 on 18 Oct.', date: '' },
                  { stage: 'Handover', state: 'upcoming', detail: 'Pickup 06:00 on 18 Oct; you confirm handover in Phnom Penh.', date: '18 Oct' },
                ].map((s, idx) => (
                  <div key={s.stage} className="flex items-start gap-3.5 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-center h-7 w-7 rounded-full shrink-0 mt-0.5 border text-xs font-mono font-medium">
                      {s.state === 'done' ? (
                        <span className="text-ok bg-ok-soft rounded-full h-full w-full flex items-center justify-center">✓</span>
                      ) : s.state === 'current' ? (
                        <span className="text-info bg-info-soft rounded-full h-full w-full flex items-center justify-center">{idx + 1}</span>
                      ) : s.state === 'blocked' ? (
                        <span className="text-bad bg-bad-soft rounded-full h-full w-full flex items-center justify-center">🔒</span>
                      ) : (
                        <span className="text-ink-tertiary bg-sunken rounded-full h-full w-full flex items-center justify-center">{idx + 1}</span>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="type-label-m text-ink font-semibold">{s.stage}</div>
                      <div className="type-body-s text-ink-secondary">{s.detail}</div>
                    </div>
                    {s.date && (
                      <span className="type-mono-caption text-right shrink-0 text-ink-tertiary">
                        {s.date}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Panel>

            {/* Who is on your move */}
            <Panel title="Who is on your move" flush>
              <div className="divide-y divide-line">
                {[
                  { name: 'Lan', role: 'transport specialist', desc: 'Checks your documents and files the border dossiers.' },
                  { name: 'Yến', logistics: 'logistics manager', role: 'logistics manager', desc: 'Approved the job; handles changes to dates or price.' },
                  { name: 'Minh', role: 'driver', desc: 'Drives trailer TX-447 on 18 Oct with two grooms.' },
                ].map((p) => (
                  <div key={p.name} className="flex items-center gap-3.5 p-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sunken text-ink font-semibold">
                      {p.name[0]}
                    </div>
                    <div className="flex flex-col">
                      <div className="type-label-s text-ink font-medium">
                        {p.name}, {p.role}
                      </div>
                      <div className="type-caption text-ink-tertiary">{p.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* Right Column (Route & Facts) */}
          <div className="flex flex-col gap-6 lg:col-span-5">
            <Panel title="Route" extra={<span className="type-caption text-ink-tertiary">Planned</span>}>
              <div className="flex flex-col gap-4">
                <p className="type-body-s text-ink-secondary m-0">
                  Planned road itinerary. Positions will come from checkpoints recorded by the escort.
                </p>

                {/* Vertical Checkpoint Timeline */}
                <div className="flex flex-col gap-3 border-l-2 border-line-strong pl-4 ml-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="type-label-s text-ink font-medium">Clearance Gate</span>
                    <span className="type-mono-caption text-bad font-medium">Departure locked</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="type-label-s text-ink font-medium">Ho Chi Minh City</span>
                    <span className="type-caption text-ink-tertiary">Pickup · 06:00</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="type-label-s text-ink font-medium">Mộc Bài – Bavet</span>
                    <span className="type-caption text-ink-tertiary">Border · 08:30</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="type-label-s text-ink font-medium">Svay Rieng</span>
                    <span className="type-caption text-ink-tertiary">Welfare stop · 09:30</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="type-label-s text-ink font-medium">Phnom Penh</span>
                    <span className="type-caption text-ink-tertiary">Delivery · 12:30</span>
                  </div>
                </div>

                <div className="border-t border-line pt-3 flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">Vehicle</span>
                    <span className="type-mono-caption text-ink font-medium">Trailer TX-447</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">Driver</span>
                    <span className="type-label-s text-ink font-medium">Minh</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">Grooms</span>
                    <span className="type-body-s text-ink">2, one per 3 horses</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">Distance</span>
                    <span className="type-mono-caption text-ink font-medium">240 km · 6.5 h</span>
                  </div>
                </div>
              </div>
            </Panel>

            {/* History Panel */}
            <Panel title="History" flush>
              <div className="divide-y divide-line p-4">
                {[
                  { time: '24 Sep · 16:02', text: 'Proof of ownership for Silver Bell rejected: bill of sale unsigned.', author: 'Lan, transport specialist' },
                  { time: '21 Sep · 10:15', text: 'EIA test for Shadowfax uploaded and approved.', author: 'Lan, transport specialist' },
                  { time: '16 Sep · 02:00', text: 'Silver Bell’s influenza booster lapsed; item reopened.', author: 'System' },
                  { time: '12 Sep · 11:30', text: 'Job approved as CBRT-2026-041; checklist created (23 items).', author: 'Yến, logistics manager' },
                  { time: '10 Sep · 18:44', text: 'Quotation v2 accepted; 30% deposit confirmed.', author: 'You' },
                ].map((h, i) => (
                  <div key={i} className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="type-mono-caption text-ink-tertiary">{h.time}</span>
                      <span className="type-caption text-ink-tertiary">{h.author}</span>
                    </div>
                    <span className="type-body-s text-ink-secondary">{h.text}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>

        {/* Upload Modal (Shared) */}
        <Modal
          open={uploadModalOpen}
          title={selectedOwedItem ? `Upload: ${selectedOwedItem.title}` : 'Upload Document'}
          onCancel={() => setUploadModalOpen(false)}
          footer={[
            <Button key="cancel" variant="secondary" size="sm" onClick={() => setUploadModalOpen(false)}>
              Cancel
            </Button>,
            <Button key="submit" variant="primary" size="sm" disabled={uploading} onClick={handleUploadSubmit}>
              {uploading ? 'Uploading...' : 'Upload & Submit'}
            </Button>,
          ]}
        >
          <div className="flex flex-col gap-4 py-3">
            {uploadError && <Alert type="error" message={uploadError} showIcon />}
            {selectedOwedItem && (
              <div className="rounded-md border border-line bg-sunken p-3 text-sm">
                <div className="type-label-s text-ink font-semibold">{selectedOwedItem.subject}</div>
                <div className="type-body-s text-ink-2 mt-1">{selectedOwedItem.reason}</div>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="type-label-s text-ink">
                Choose Document File <span className="text-bad">*</span>
              </label>
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg"
                onChange={handleFileChange}
                className="border border-line rounded p-2 text-sm bg-card text-ink"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="type-label-s text-ink">Issued Date *</label>
                <Input type="date" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="type-label-s text-ink">Valid Until *</label>
                <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="type-label-s text-ink">Issuing Authority / Clinic</label>
              <Input
                placeholder="e.g. Regional Animal Health Office, PVI Insurance"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: MY REQUESTS LIST VIEW (Figma: Tracking · My requests)
  // =========================================================================
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      {/* Header */}
      <PageHeader
        title="My requests"
        summary={`${home.moves.length} active, 1 past · ${home.clubName}`}
      />

      {/* Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-line pb-4">
        {/* Active / Past Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={cx(
              'rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors cursor-pointer',
              activeTab === 'active'
                ? 'bg-gold text-gold-on font-semibold'
                : 'text-ink-secondary hover:text-ink hover:bg-sunken',
            )}
          >
            Active · {home.moves.length}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('past')}
            className={cx(
              'rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors cursor-pointer',
              activeTab === 'past'
                ? 'bg-gold text-gold-on font-semibold'
                : 'text-ink-secondary hover:text-ink hover:bg-sunken',
            )}
          >
            Past · 1
          </button>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search: Code, route or horse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-72 rounded-lg border border-line bg-sunken px-3.5 py-1.5 type-body-s text-ink focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
          />
        </div>
      </div>

      {/* Requests Table Block */}
      <Panel
        flush
        title={`${activeMoves.length} active requests`}
        extra={<span className="type-caption text-ink-tertiary">Order: what needs you first</span>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-sunken/40 text-xs font-mono uppercase tracking-wider text-ink-tertiary">
                <th className="py-3 px-5">Request</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4 text-center">Horses</th>
                <th className="py-3 px-4">Departs</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4 text-right">Owed</th>
                <th className="py-3 px-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {activeMoves.map((m) => {
                const isAir = m.detail.includes('air');
                const stageIndex = STAGES.indexOf(m.stage as Stage);

                return (
                  <tr
                    key={m.requestCode}
                    onClick={() => {
                      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                      setSearchParams({ code: m.requestCode });
                    }}
                    className="group cursor-pointer transition-colors hover:bg-sunken/60"
                  >
                    {/* Request / Reference */}
                    <td className="py-4 px-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="type-mono-caption font-semibold text-ink group-hover:text-gold">
                          {m.requestCode}
                        </span>
                        <span className="type-mono-caption text-ink-tertiary">
                          {m.detail.split('·')[0].trim()}
                        </span>
                      </div>
                    </td>

                    {/* Route & Mode */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2.5">
                        <Icon
                          name={isAir ? 'plane' : 'truck'}
                          size={18}
                          className="shrink-0 text-ink-tertiary"
                        />
                        <div className="flex flex-col">
                          <span className="type-label-s font-semibold text-ink">{m.route}</span>
                          <span className="type-caption text-ink-tertiary">
                            {isAir ? 'Air · Business class' : 'Road · Private trailer'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Horses */}
                    <td className="py-4 px-4 text-center">
                      <span className="type-mono-data font-medium text-ink">
                        {m.requestCode === 'REQ-2026-0162' ? 4 : 2}
                      </span>
                    </td>

                    {/* Departs */}
                    <td className="py-4 px-4">
                      <span className="type-mono-caption text-ink-secondary">
                        {m.departsAt ? new Date(m.departsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '18 Oct 2026'}
                      </span>
                    </td>

                    {/* Stage & 7-Segment Progress Track */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1.5">
                        <StageMark stage={m.stage} />
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 7 }).map((_, i) => (
                            <span
                              key={i}
                              className={cx(
                                'h-1 w-3.5 rounded-full',
                                i < stageIndex
                                  ? 'bg-ink'
                                  : i === stageIndex
                                    ? 'bg-ink-secondary'
                                    : 'bg-line-strong',
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </td>

                    {/* Owed Badge */}
                    <td className="py-4 px-4 text-right">
                      {m.holds.tone === 'neutral' ? (
                        <span className="type-caption text-ink-tertiary">Nothing needed</span>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <Chip tone={m.holds.tone}>
                            {m.holds.text.includes('owe') ? 'You owe 4' : 'Quote ready'}
                          </Chip>
                          <span className="type-mono-caption text-ink-tertiary">
                            {m.requestCode === 'REQ-2026-0162' ? 'First due 4 Oct' : 'Due 30 Sep'}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Open Arrow */}
                    <td className="py-4 px-4 text-right">
                      <Icon
                        name="arrow-right"
                        size={16}
                        className="text-ink-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-gold"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Footer Hint */}
      <p className="type-body-s m-0 max-w-3xl text-ink-tertiary">
        Your request number stays the same from submission to handover; the quotation and job codes
        appear beside it once they exist.
      </p>
    </div>
  );
};

export default MyRequestsPage;
