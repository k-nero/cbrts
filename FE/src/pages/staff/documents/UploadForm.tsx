import { type FC, useState } from 'react';
import { Col, Flex, Input, Row } from 'antd';
import { fileApi } from '@/apis/file';
import { Button, Callout } from '@/components/ui';
import { useUploadDocumentVersion } from '@/hooks/clearance';
import type { ChecklistItem } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

export const UploadForm: FC<{ item: ChecklistItem; jobId: string | null; onClose: () => void }> = ({
  item,
  jobId,
  onClose,
}) => {
  const upload = useUploadDocumentVersion(jobId);
  const [file, setFile] = useState<File | null>(null);
  const [issuedOn, setIssuedOn] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [issuer, setIssuer] = useState('');
  const [sendingFile, setSendingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = sendingFile || upload.isPending;

  const submit = async () => {
    if (!file) {
      setError('Choose the document file to upload.');
      return;
    }
    if (!issuedOn.trim() || !validUntil.trim()) {
      setError('Enter the issue date and the valid-until date printed on the document.');
      return;
    }
    setError(null);
    setSendingFile(true);
    try {
      // Store the file first, then attach it as the item's new version, which checks its validity.
      const stored = await fileApi.upload(file);
      await upload.mutateAsync({
        checklistItemId: item.id,
        data: {
          fileId: stored.id,
          issuedOn: issuedOn.trim(),
          validUntil: validUntil.trim(),
          issuer: issuer.trim() || undefined,
        },
      });
      onClose();
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'The document could not be uploaded.'));
    } finally {
      setSendingFile(false);
    }
  };

  return (
    <Flex vertical gap={16}>
      {error && <Callout tone="bad" title={error} />}

      <Flex vertical gap={6}>
        <label className="type-label-s text-ink">
          File (PDF, JPEG, PNG or HEIC, up to 25 MB) <span className="text-bad">*</span>
        </label>
        <input
          type="file"
          onChange={(event) => {
            const chosen = event.target.files?.[0];
            if (chosen) setFile(chosen);
          }}
          accept=".pdf,.png,.jpg,.jpeg,.heic,.heif"
          className="type-body-s rounded border border-line p-2"
        />
        {file && (
          <span className="type-caption text-ink-3">
            Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </span>
        )}
      </Flex>

      <Row gutter={[12, 12]}>
        <Col span={12}>
          <Flex vertical gap={6}>
            <label className="type-label-s text-ink">
              Issued on <span className="text-bad">*</span>
            </label>
            <Input
              type="date"
              required
              value={issuedOn}
              onChange={(event) => setIssuedOn(event.target.value)}
            />
          </Flex>
        </Col>

        <Col span={12}>
          <Flex vertical gap={6}>
            <label className="type-label-s text-ink">
              Valid until <span className="text-bad">*</span>
            </label>
            <Input
              type="date"
              required
              value={validUntil}
              onChange={(event) => setValidUntil(event.target.value)}
            />
          </Flex>
        </Col>
      </Row>

      <Flex vertical gap={6}>
        <label className="type-label-s text-ink">Issuer (authority or laboratory)</label>
        <Input
          placeholder="e.g. DAH Vietnam, USDA APHIS"
          value={issuer}
          onChange={(event) => setIssuer(event.target.value)}
        />
      </Flex>

      <Flex justify="end" gap={8}>
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" disabled={busy} onClick={submit}>
          {busy ? 'Uploading…' : 'Upload and check'}
        </Button>
      </Flex>
    </Flex>
  );
};
