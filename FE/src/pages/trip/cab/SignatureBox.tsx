import { Button } from '@/components/ui';

type Props = {
  signatureName: string;
  signedWhen?: string;
  onClear?: () => void;
};

export function SignatureBox({
  signatureName,
  signedWhen = 'Signed on this tablet',
  onClear,
}: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line-strong bg-muted/20 p-4">
      <div className="flex h-16 items-end pb-2">
        <span className="font-serif text-3xl italic tracking-wide text-ink">
          {signatureName || 'Awaiting signature...'}
        </span>
      </div>
      <div className="flex items-center justify-between border-t border-line pt-2">
        <span className="type-body-s text-ink-2">{signedWhen}</span>
        {onClear && (
          <Button variant="secondary" size="sm" onClick={onClear}>
            Clear signature
          </Button>
        )}
      </div>
    </div>
  );
}
