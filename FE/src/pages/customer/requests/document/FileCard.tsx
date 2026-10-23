import type { FC } from 'react';

import { Button, cx, Icon } from '@/components/ui';
import { fileSize } from '@/lib/utils';

type Props = {
  file: File | null;
  refused: boolean;
  error?: string;
  onChoose: () => void;
  onRemove: () => void;
};

/** The chosen file with its size, or the prompt to choose one and what is accepted. */
export const FileCard: FC<Props> = ({ file, refused, error, onChoose, onRemove }) => (
  <div className="flex flex-col gap-1.5">
    <div
      className={cx(
        'flex items-center gap-3 rounded-lg border bg-sunken py-3 pr-4 pl-3',
        error ? 'border-bad' : 'border-line',
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon name="file" size={18} className="text-ink-2" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="type-data truncate text-ink">{file ? file.name : 'No file chosen'}</span>
        <span className="type-caption text-ink-3">
          {file
            ? `${fileSize(file.size)}${refused ? ' · checked · not saved' : ''}`
            : 'PDF, JPEG, PNG or HEIC, up to 25 MB'}
        </span>
      </span>
      {file ? (
        <Button variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      ) : (
        <Button variant="secondary" size="sm" leadingIcon="upload" onClick={onChoose}>
          Choose a file
        </Button>
      )}
    </div>
    {error && (
      <span role="alert" className="type-body-s text-bad">
        {error}
      </span>
    )}
  </div>
);
