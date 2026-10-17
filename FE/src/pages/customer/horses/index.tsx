import { useState, useMemo, type FC } from 'react';
import PageHeader from '@/components/PageHeader';
import { Panel, Chip, Icon, COAT_SWATCH, TONE_FG, cx } from '@/components/ui';
import { useCustomerHome } from '@/hooks/home';

export const MyHorsesPage: FC = () => {
  const { data: home, isPending } = useCustomerHome();
  const [searchQuery, setSearchQuery] = useState('');

  const horses = useMemo(() => {
    if (!home?.horses) return [];
    if (!searchQuery.trim()) return home.horses;
    const q = searchQuery.toLowerCase();
    return home.horses.filter(
      (h) => h.name.toLowerCase().includes(q) || h.line.toLowerCase().includes(q),
    );
  }, [home?.horses, searchQuery]);

  if (isPending || !home) {
    return (
      <div className="flex h-64 items-center justify-center text-ink-tertiary">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        <span className="ml-3 type-body-m">Loading horses...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <PageHeader
        title="My horses"
        summary={`${home.horseCount} registered horses · ${home.clubName}. Documents and passports on file.`}
      />

      <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
        <div className="type-label-s text-ink-secondary">
          {home.horsesNote || 'Documents cleared for the 18 Oct move, CBRT-2026-041.'}
        </div>
        <input
          type="text"
          placeholder="Search horses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-64 rounded-lg border border-line bg-sunken px-3.5 py-1.5 type-body-s text-ink focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {horses.map((horse) => (
          <div
            key={horse.id}
            className="flex items-start justify-between rounded-xl border border-line bg-card p-5 shadow-xs"
          >
            <div className="flex items-start gap-3.5">
              <span
                aria-hidden
                className={cx(
                  'mt-1 size-4 shrink-0 rounded-full border border-line-strong ring-2 ring-card',
                  COAT_SWATCH[horse.coat],
                )}
              />
              <div className="flex flex-col gap-1">
                <span className="type-h4 text-ink font-semibold">{horse.name}</span>
                <span className="type-body-s text-ink-secondary">{horse.line}</span>
                <span className="type-mono-caption text-ink-tertiary mt-1">
                  Passport ID: EQ-{horse.id.toUpperCase()}-2026
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5 text-right">
              <Chip tone={horse.documents.includes('5 of 5') ? 'ok' : 'info'}>
                {horse.documents}
              </Chip>
              {horse.note && (
                <span className={cx('type-caption font-medium', TONE_FG[horse.note.tone])}>
                  {horse.note.text}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyHorsesPage;
