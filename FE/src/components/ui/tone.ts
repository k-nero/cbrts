/*
 * Status tones (DESIGN.md, Status). Gold is never a tone: state uses ok, warn, bad, info or
 * neutral, and is always said twice, as the tone and as a word.
 */
export type Tone = 'neutral' | 'ok' | 'warn' | 'bad' | 'info';
export type StatusTone = Exclude<Tone, 'neutral'>;

/** Tinted fill and matching border: chips, callouts, gates. */
export const TONE_SURFACE: Record<Tone, string> = {
  neutral: 'bg-muted border-line-strong',
  ok: 'bg-ok-soft border-ok-line',
  warn: 'bg-warn-soft border-warn-line',
  bad: 'bg-bad-soft border-bad-line',
  info: 'bg-info-soft border-info-line',
};

/** The tone as ink on a chip or icon. */
export const TONE_FG: Record<Tone, string> = {
  neutral: 'text-ink-2',
  ok: 'text-ok',
  warn: 'text-warn',
  bad: 'text-bad',
  info: 'text-info',
};

/** The tone as a strong figure (stat tile values, deadlines): neutral reads as Parchment. */
export const TONE_FIGURE: Record<Tone, string> = { ...TONE_FG, neutral: 'text-ink' };

export const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-ink-3',
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
  info: 'bg-info',
};

/** Joins class names, skipping falsy parts. */
export const cx = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(' ');
