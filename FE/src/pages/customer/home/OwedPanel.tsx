import { type ChangeEvent, type FC, useState } from 'react';
import { Alert, Input, message, Modal } from 'antd';
import { fileApi } from '@/apis/file';
import { apiErrorMessage } from '@/lib/utils';

import { Button, Chip, OwedItem } from '@/components/ui';
import type { CustomerHome } from '@/interfaces';
import { daysUntil, dueLeft, formatDate, ict } from '@/lib/utils';

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
