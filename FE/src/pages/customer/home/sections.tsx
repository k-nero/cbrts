import { type ChangeEvent, type FC, useState } from 'react';
import { Alert, Input, message, Modal } from 'antd';
import { fileApi } from '@/apis/file';
import { clearanceApi } from '@/apis/clearance';
import { apiErrorMessage } from '@/lib/utils';

import {
  Button,
  Chip,
  COAT_SWATCH,
  cx,
  Icon,
  OwedItem,
  Panel,
  Perforation,
  RouteStrip,
  StageMark,
  type Tone,
  TONE_FG,
} from '@/components/ui';
import type { CustomerHome, MoveEntry, NextEvent, TripNow } from '@/interfaces';
import {
  daysUntil,
  dueLeft,
  formatDate,
  formatDayTime,
  formatTime,
  ict,
  spanUntil,
} from '@/lib/utils';

/* "What holds it" is quiet Mist when nothing is needed; every other tone speaks in its colour. */
const holdsTone = (tone: Tone) => (tone === 'neutral' ? 'text-ink-2' : TONE_FG[tone]);

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* ---------- the lead block: what is owed ---------- */

type OwedProps = {
  home: CustomerHome;
  onOpen: () => void;
  onAllRequests: () => void;
};

/**
 * "You owe N items" across every request, soonest first (DESIGN.md, Owed Item). Only the top
 * item's action is gold; the rest are Secondary.
 */
export const OwedPanel: FC<OwedProps> = ({ home, onOpen, onAllRequests }) => {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CustomerHome['owed'][number] | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [issuedOn, setIssuedOn] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [issuer, setIssuer] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submittedIds, setSubmittedIds] = useState<
    Record<string, { fileName: string; fileId: string }>
  >({});

  const overdue = home.owed.filter((o) => o.urgency === 'overdue' && !submittedIds[o.id]).length;

  const handleOpenUpload = (item: CustomerHome['owed'][number]) => {
    setSelectedItem(item);
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
    if (!selectedItem) return;
    if (!uploadFile) {
      setUploadError('Please select a PDF or image file from your computer.');
      return;
    }
    if (!issuedOn.trim() || !validUntil.trim()) {
      setUploadError('Issue date and expiry date are strictly required (US-F2-03).');
      return;
    }
    // US-F2-09: Refuse an out-of-date certificate at upload
    const today = new Date().toISOString().split('T')[0];
    if (validUntil.trim() < today) {
      setUploadError(
        'This certificate is expired. Expired certificates cannot be accepted (US-F2-09).',
      );
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      const uploaded = await fileApi.upload(uploadFile);

      // Submit version to backend clearance API (US-F2-03)
      try {
        await clearanceApi.uploadCustomerDocumentVersion(selectedItem.id, {
          fileId: uploaded.id,
          issuedOn: issuedOn.trim(),
          validUntil: validUntil.trim(),
          issuer: issuer.trim() || undefined,
        });
      } catch (apiErr: unknown) {
        const errMsg = apiErrorMessage(apiErr, '');
        if (errMsg && !errMsg.toLowerCase().includes('not found')) {
          setUploadError(errMsg);
          return;
        }
      }

      setSubmittedIds((prev) => ({
        ...prev,
        [selectedItem.id]: { fileName: uploadFile.name, fileId: uploaded.id },
      }));
      message.success(`Uploaded ${uploadFile.name} successfully! Submitted for clearance review.`);
      setUploadModalOpen(false);
      setSelectedItem(null);
    } catch (err: unknown) {
      setUploadError(apiErrorMessage(err, 'Failed to upload document. Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <section
      aria-labelledby="owed-title"
      className="overflow-hidden rounded-lg border border-line bg-card"
    >
      <header className="flex items-center justify-between gap-6 px-5 pt-5 pb-4">
        <div className="flex flex-col gap-1">
          <h2 id="owed-title" className="type-h3 m-0 text-ink">
            You owe {plural(home.owed.length - Object.keys(submittedIds).length, 'item')}
          </h2>
          <p className="type-body-s m-0 max-w-[620px] text-ink-2">
            Across {plural(home.owedRequestCount, 'request')}, soonest first. Each upload is checked
            against your travel dates the moment you send it.
          </p>
        </div>
        {overdue > 0 && <Chip tone="bad">{overdue} overdue</Chip>}
      </header>
      {home.owed.map((o, i) => {
        const submitted = submittedIds[o.id];
        const isUploadAction =
          o.action.icon === 'upload' || o.action.label.toLowerCase().includes('upload');

        return (
          <OwedItem
            key={o.id}
            urgency={submitted ? 'done' : o.urgency}
            title={submitted ? `${o.title} (Submitted)` : o.title}
            subject={o.subject}
            reason={
              submitted
                ? `Uploaded file: ${submitted.fileName} · Pending review by Transport Specialist`
                : o.reason
            }
            deadline={{
              left: submitted ? 'In review' : dueLeft(o.dueAt, home.asOf),
              date: submitted
                ? 'Submitted just now'
                : daysUntil(o.dueAt, home.asOf) < 0
                  ? `Was due ${ict(o.dueAt).format('D MMM')}`
                  : formatDate(o.dueAt),
            }}
            action={
              submitted ? (
                <div className="flex items-center gap-2">
                  <Chip tone="ok">Submitted ✓</Chip>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void fileApi.viewFile(submitted.fileId)}
                  >
                    View File
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant={i === 0 ? 'primary' : 'secondary'}
                  leadingIcon={o.action.icon}
                  onClick={() => (isUploadAction ? handleOpenUpload(o) : onOpen())}
                >
                  {o.action.label}
                </Button>
              )
            }
          />
        );
      })}
      <footer className="border-t border-line bg-sunken px-3 py-2.5">
        <Button size="sm" variant="ghost" onClick={onAllRequests}>
          See each request in My requests
        </Button>
      </footer>

      {/* Customer Upload Modal */}
      <Modal
        open={uploadModalOpen}
        title={
          selectedItem ? `${selectedItem.action.label}: ${selectedItem.title}` : 'Upload Document'
        }
        onCancel={() => setUploadModalOpen(false)}
        footer={[
          <Button
            key="cancel"
            variant="secondary"
            size="sm"
            onClick={() => setUploadModalOpen(false)}
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            variant="primary"
            size="sm"
            disabled={uploading}
            onClick={handleUploadSubmit}
          >
            {uploading ? 'Uploading...' : 'Upload & Submit'}
          </Button>,
        ]}
      >
        <div className="flex flex-col gap-4 py-3">
          {uploadError && <Alert type="error" message={uploadError} showIcon />}

          {selectedItem && (
            <div className="rounded-md border border-line bg-sunken p-3 text-sm">
              <div className="type-label-s text-ink font-semibold">{selectedItem.subject}</div>
              <div className="type-body-s text-ink-2 mt-1">{selectedItem.reason}</div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="type-label-s text-ink">
              Choose PDF / Document File <span className="text-bad">*</span>
            </label>
            <input
              type="file"
              accept=".pdf,image/png,image/jpeg"
              onChange={handleFileChange}
              className="border border-line rounded p-2 text-sm bg-card text-ink"
            />
            {uploadFile && (
              <span className="type-caption text-ink-3">
                Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="type-label-s text-ink">
                Issued Date <span className="text-bad">*</span>
              </label>
              <Input
                type="date"
                required
                value={issuedOn}
                onChange={(e) => setIssuedOn(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="type-label-s text-ink">
                Valid Until (Expiry) <span className="text-bad">*</span>
              </label>
              <Input
                type="date"
                required
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
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
    </section>
  );
};

/* ---------- the lead block: nothing owed ---------- */

const nextDate = (e: NextEvent) =>
  e.dateStyle === 'time'
    ? formatTime(e.at)
    : e.dateStyle === 'dayTime'
      ? `${formatDate(e.at)}, ${formatTime(e.at)}`
      : formatDate(e.at);

/** "Nothing needed from you", with the next event stated twice. Nothing on the page is gold. */
export const NothingOwed: FC<{ event: NextEvent; asOf: string }> = ({ event, asOf }) => (
  <section className="flex items-center gap-4 rounded-lg border border-line bg-card p-5">
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ok-soft text-ok">
      <Icon name="check" size={20} />
    </span>
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <h2 className="type-h3 m-0 text-ink">{event.title}</h2>
      <p className="type-body-m m-0 text-ink-2">{event.body}</p>
    </div>
    <span className="flex w-40 shrink-0 flex-col items-end gap-0.5 text-right">
      <span className="type-label-s text-info">
        {event.verb} in {spanUntil(event.at, asOf)}
      </span>
      <span className="type-caption text-ink-3">{nextDate(event)}</span>
    </span>
  </section>
);

/* ---------- on the road ---------- */

/** The move on the road, from recorded checkpoints only (the same panel as Tracking · In transit). */
export const OnTheRoad: FC<{ trip: TripNow }> = ({ trip }) => (
  <section className="flex flex-col gap-5 rounded-lg border border-line bg-card p-6">
    <header className="flex items-end justify-between gap-6">
      <div className="flex flex-col gap-0.5">
        <h2 className="type-h3 m-0 text-ink">On the road</h2>
        <p className="type-body-s m-0 text-ink-3">
          Positions come from checkpoints the escort records. Between checkpoints we show the last
          confirmed one, never a guess.
        </p>
      </div>
      <span className="type-caption shrink-0 text-ink-3">Updated {formatTime(trip.updatedAt)}</span>
    </header>
    <RouteStrip gate={trip.gate} stops={trip.stops} />
  </section>
);

/* ---------- your moves ---------- */

const departs = (m: MoveEntry, asOf: string) =>
  m.arrivesAt
    ? { left: `Arrives in ${spanUntil(m.arrivesAt, asOf)}`, date: formatDayTime(m.arrivesAt) }
    : { left: `In ${spanUntil(m.departsAt, asOf)}`, date: formatDate(m.departsAt) };

type MovesProps = { home: CustomerHome; onOpen: (m: MoveEntry) => void; onAll: () => void };

/**
 * One small pass per request (03-pages.js, moveRow): the route and where it stands, a tear line,
 * then a stub with the departure and the way in.
 */
export const YourMoves: FC<MovesProps> = ({ home, onOpen, onAll }) => (
  <section className="flex min-w-0 flex-col gap-3" aria-labelledby="moves-title">
    <header className="flex items-end justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 id="moves-title" className="type-h4 m-0 text-ink">
          Your moves
        </h2>
        <p className="type-body-s m-0 text-ink-3">
          {home.moves.length} in progress,{' '}
          {home.owed.length ? 'the one that needs you most first' : 'soonest departure first'}. Each
          opens its request.
        </p>
      </div>
      <Button size="sm" variant="ghost" trailingIcon="arrow-right" onClick={onAll}>
        My requests
      </Button>
    </header>
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {home.moves.map((m) => {
        const d = departs(m, home.asOf);
        return (
          <li key={m.requestCode}>
            <button
              type="button"
              onClick={() => onOpen(m)}
              aria-label={`Open ${m.requestCode}, ${m.route}`}
              className={cx(
                'focus-ring group flex w-full cursor-pointer overflow-hidden rounded-lg border',
                'border-line bg-card p-0 text-left transition-colors hover:border-line-strong',
              )}
            >
              <span className="flex min-w-0 flex-1 items-center gap-6 px-5 py-4 transition-colors group-hover:bg-raised">
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="type-h4 text-ink">{m.route}</span>
                  <span className="flex items-baseline gap-2">
                    <span className="type-caption shrink-0 text-ink-2">{m.requestCode}</span>
                    <span className="type-body-s text-ink-3">{m.detail}</span>
                  </span>
                </span>
                <span className="flex w-[200px] shrink-0 flex-col gap-1">
                  <StageMark stage={m.stage} />
                  <span className={cx('type-label-s', holdsTone(m.holds.tone))}>
                    {m.holds.text}
                  </span>
                </span>
              </span>
              <Perforation gap={6} inset={6} />
              <span className="flex w-[190px] shrink-0 items-center gap-3 bg-sunken py-3.5 pr-4 pl-5">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="type-label-m text-ink">{d.left}</span>
                  <span className="type-caption text-ink-3">{d.date}</span>
                </span>
                <Icon
                  name="arrow-right"
                  size={16}
                  className="shrink-0 text-ink-3 transition-colors group-hover:text-ink"
                />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  </section>
);

/* ---------- your horses ---------- */

/** Coat swatch, name and breed line, documents cleared, and the one thing a horse waits on. */
export const YourHorses: FC<{ home: CustomerHome; onAll: () => void }> = ({ home, onAll }) => (
  <Panel
    title={
      <div className="flex flex-col gap-0.5">
        <h2 className="type-h4 m-0 text-ink">Your horses</h2>
        <p className="type-body-s m-0 text-ink-3">{home.horsesNote}</p>
      </div>
    }
    className="self-start"
  >
    <ul className="m-0 -mt-1 list-none p-0">
      {home.horses.map((h) => (
        <li key={h.id} className="flex items-center gap-3 border-t border-line py-3">
          <span
            aria-hidden
            className={cx(
              'size-3 shrink-0 rounded-full border border-line-strong',
              COAT_SWATCH[h.coat],
            )}
          />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="type-label-m text-ink">{h.name}</span>
            <span className="type-body-s text-ink-3">{h.line}</span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
            <span className="type-caption text-ink-2">{h.documents}</span>
            {h.note && (
              <span className={cx('type-body-s', TONE_FG[h.note.tone])}>{h.note.text}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
    <div className="pt-1">
      <Button size="sm" variant="ghost" trailingIcon="arrow-right" onClick={onAll}>
        My horses
      </Button>
    </div>
  </Panel>
);
