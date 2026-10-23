import { Button } from '@/components/ui';

type Props = {
  summary: string;
  sub: string;
  actionText?: string;
  onAction?: () => void;
  isActionLoading?: boolean;
  isActionDisabled?: boolean;
  secondaryText?: string;
  onSecondary?: () => void;
};

export function CabDock({
  summary,
  sub,
  actionText,
  onAction,
  isActionLoading,
  isActionDisabled,
  secondaryText,
  onSecondary,
}: Props) {
  return (
    <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-4 border-t-2 border-line-strong bg-card px-8 py-4 shadow-lg">
      <div className="flex flex-1 flex-col">
        <span className="type-label-m font-bold text-ink">{summary}</span>
        <span className="type-body-s text-ink-2">{sub}</span>
      </div>

      <div className="flex items-center gap-3">
        {secondaryText && (
          <Button variant="secondary" onClick={onSecondary} className="h-14 px-6">
            {secondaryText}
          </Button>
        )}
        {actionText && (
          <Button
            variant="primary"
            onClick={onAction}
            disabled={isActionDisabled || isActionLoading}
            leadingIcon="check"
            className="h-14 min-w-[280px] px-8 text-base font-bold shadow-md md:min-w-[360px]"
          >
            {isActionLoading ? 'Saving...' : actionText}
          </Button>
        )}
      </div>
    </div>
  );
}
