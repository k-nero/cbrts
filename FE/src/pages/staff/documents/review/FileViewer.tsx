import { useEffect, useState, type FC } from 'react';
import { fileApi } from '@/apis/file';
import { Button, Icon } from '@/components/ui';
import type { DocumentReviewDetail } from '@/interfaces';

type Props = {
  detail: DocumentReviewDetail;
};

/**
 * The document file viewer (Figma: fileViewer, paperDoc).
 * Shows the document file or a structured paper rendering with letterhead, fields and stamps.
 */
export const FileViewer: FC<Props> = ({ detail }) => {
  const { version, item, clubName } = detail;
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [hasBlobError, setHasBlobError] = useState(false);

  useEffect(() => {
    let active = true;
    let url: string | null = null;

    if (version.fileId) {
      fileApi
        .getBlob(version.fileId)
        .then((blob) => {
          if (!active) return;
          url = URL.createObjectURL(blob);
          setBlobUrl(url);
        })
        .catch(() => {
          if (!active) return;
          setHasBlobError(true);
        });
    }

    return () => {
      active = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [version.fileId]);

  const handleOpenOriginal = () => {
    if (version.fileId) {
      void fileApi.viewFile(version.fileId);
    }
  };

  const isPdf = version.contentType?.includes('pdf') || version.fileName?.endsWith('.pdf');
  const isImage =
    version.contentType?.startsWith('image/') ||
    /\.(png|jpe?g|webp)$/i.test(version.fileName ?? '');

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-card shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Icon name="file" size={18} className="text-ink-2" />
          <span className="type-data truncate text-ink">{version.fileName || 'Document'}</span>
          <span className="type-caption text-ink-3">Page 1 of 1</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleOpenOriginal}>
          Open original
        </Button>
      </div>

      {/* Sunken document well */}
      <div className="flex min-h-[520px] flex-col items-center justify-center bg-canvas p-8">
        {blobUrl && isPdf && !hasBlobError ? (
          <iframe
            src={blobUrl}
            title={version.fileName || 'Document'}
            className="h-[600px] w-full rounded border border-line bg-card"
          />
        ) : blobUrl && isImage && !hasBlobError ? (
          <img
            src={blobUrl}
            alt={version.fileName || 'Document'}
            className="max-h-[600px] rounded border border-line object-contain shadow-md"
          />
        ) : (
          /* Paper document presentation matching Figma paperDoc */
          <div className="w-full max-w-xl rounded border border-line-strong bg-card p-8 shadow-md">
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div>
                <h3 className="type-h3 text-ink">{version.issuer || 'NAVETCO Laboratory'}</h3>
                <p className="type-body-s text-ink-2">
                  National Centre for Veterinary Diagnostics · Accredited Testing Branch
                </p>
              </div>
              <div className="text-right">
                <span className="type-caption font-mono text-ink-3">
                  Certificate Ref: {version.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <span className="type-label-m text-ink">
                {item.documentTypeName || 'Veterinary & Legal Inspection Certificate'}
              </span>
            </div>

            <div className="mt-4 divide-y divide-line border-y border-line">
              <div className="flex items-center justify-between py-2 text-sm">
                <span className="w-44 text-ink-2">Horse</span>
                <span className="type-data flex-1 text-ink">{item.horseName || 'All horses'}</span>
              </div>
              {item.horseMicrochip && (
                <div className="flex items-center justify-between py-2 text-sm">
                  <span className="w-44 text-ink-2">Microchip</span>
                  <span className="type-data flex-1 text-ink">{item.horseMicrochip}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 text-sm">
                <span className="w-44 text-ink-2">Owner / Club</span>
                <span className="type-data flex-1 text-ink">{clubName || 'Client Club'}</span>
              </div>
              {version.sampledOn && (
                <div className="flex items-center justify-between py-2 text-sm">
                  <span className="w-44 text-ink-2">Date sampled</span>
                  <span className="type-data flex-1 text-ink">{version.sampledOn}</span>
                </div>
              )}
              {version.issuedOn && (
                <div className="flex items-center justify-between py-2 text-sm">
                  <span className="w-44 text-ink-2">Date issued</span>
                  <span className="type-data flex-1 text-ink">{version.issuedOn}</span>
                </div>
              )}
              {version.validUntil && (
                <div className="flex items-center justify-between py-2 text-sm">
                  <span className="w-44 text-ink-2">Valid until</span>
                  <span className="type-data flex-1 text-ink">{version.validUntil}</span>
                </div>
              )}
            </div>

            {/* Test result badge */}
            <div className="mt-6 flex items-center justify-between rounded border border-ink p-3">
              <span className="type-body-s text-ink-2">Result</span>
              <span className="type-h4 font-bold text-ink">NEGATIVE / PASSED</span>
            </div>

            {/* Signatures box */}
            <div className="mt-6 grid grid-cols-2 gap-4 pt-2">
              <div className="rounded border border-line p-3">
                <div className="h-8 italic text-ink">T. V. Phúc</div>
                <div className="border-t border-line pt-2">
                  <div className="type-body-s text-ink-2">Sampling veterinarian</div>
                  <div className="type-label-s text-ink">Dr Trần Văn Phúc</div>
                </div>
              </div>
              <div className="rounded border border-line p-3">
                <div className="h-8 italic text-ink">L. T. Mai</div>
                <div className="border-t border-line pt-2">
                  <div className="type-body-s text-ink-2">Laboratory head · stamp</div>
                  <div className="type-label-s text-ink">Dr Lê Thị Mai</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
