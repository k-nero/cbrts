import type { FC } from 'react';
import { Empty, Skeleton } from 'antd';
import { fileApi } from '@/apis/file';
import { Button, Panel } from '@/components/ui';
import { useFileBlobUrl } from '@/hooks/file';
import type { DocumentVersion } from '@/interfaces';

type Props = {
  version: DocumentVersion;
};

/**
 * The uploaded file (Figma: fileViewer). PDFs and images are shown inline; any other file is
 * opened in its own tab with "Open original".
 */
export const FileViewer: FC<Props> = ({ version }) => {
  const { url, isLoading } = useFileBlobUrl(version.fileId ?? '');
  const name = version.fileName || 'Document';
  const isPdf = Boolean(
    version.contentType?.includes('pdf') || version.fileName?.toLowerCase().endsWith('.pdf'),
  );
  const isImage = Boolean(
    version.contentType?.startsWith('image/') ||
    /\.(png|jpe?g|webp)$/i.test(version.fileName ?? ''),
  );

  return (
    <Panel
      flush
      title={<span className="type-data truncate text-ink">{name}</span>}
      extra={
        version.fileId && (
          // viewFile opens the tab inside the click, so popup blockers let it through.
          <Button variant="ghost" size="sm" onClick={() => void fileApi.viewFile(version.fileId)}>
            Open original
          </Button>
        )
      }
    >
      <div className="bg-sunken p-8">
        {isLoading ? (
          <Skeleton active />
        ) : url && isPdf ? (
          <iframe src={url} title={name} className="h-150 w-full rounded border border-line" />
        ) : url && isImage ? (
          <img src={url} alt={name} className="mx-auto block max-h-150 rounded object-contain" />
        ) : (
          <Empty
            description={
              version.fileId
                ? 'This file type has no preview here. Open the original to read it.'
                : 'No file is attached to this version.'
            }
          />
        )}
      </div>
    </Panel>
  );
};
