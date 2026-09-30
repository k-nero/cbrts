/*
 * EquiFreight colours (DESIGN.md). Navy surfaces, gold only for the one forward action,
 * status always in tone plus word. Two palettes: dark (the control room) and light (paper).
 *
 * The same values are CSS variables in index.css (dark on :root, light under
 * [data-theme='light']) and AntD tokens in config/themeConfig.ts; keep the three in step.
 */

export type ThemeMode = 'light' | 'dark';

export type Palette = {
  bgCanvas: string;
  bgSunken: string;
  bgInput: string;
  bgCard: string;
  bgRaised: string;
  bgMuted: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  disabled: string;
  accent: string;
  accentHover: string;
  accentOn: string;
  accentText: string;
  controlOn: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  shadow: string;
};

/** Raw values, for AntD's seed tokens (its algorithm derives shades, so it needs real colours). */
export const PALETTE: Record<ThemeMode, Palette> = {
  dark: {
    bgCanvas: '#0C1520',
    bgSunken: '#09111A',
    bgInput: '#0E1826',
    bgCard: '#111B2C',
    bgRaised: '#15223A',
    bgMuted: '#182538',
    border: '#1C2E44',
    borderStrong: '#2A4266',
    textPrimary: '#EDE9E1',
    textSecondary: '#B3BFCC',
    textTertiary: '#7A8FA3',
    disabled: '#4A5B70',
    accent: '#C9AA5A',
    accentHover: '#D6B96B',
    accentOn: '#0C1520',
    accentText: '#D9BD72',
    controlOn: '#B3BFCC',
    success: '#5DC688',
    warning: '#FDB47A',
    error: '#EF6B6B',
    info: '#7FB0E8',
    shadow: 'rgba(0, 0, 0, 0.4)',
  },
  light: {
    bgCanvas: '#F6F4EF',
    bgSunken: '#EFECE5',
    bgInput: '#FFFFFF',
    bgCard: '#FFFFFF',
    bgRaised: '#FFFFFF',
    bgMuted: '#EAE6DC',
    border: '#E2DDD2',
    borderStrong: '#C9C2B2',
    textPrimary: '#0C1520',
    textSecondary: '#3D4E63',
    textTertiary: '#66788C',
    disabled: '#A3AEBB',
    accent: '#C9AA5A',
    accentHover: '#B8983F',
    accentOn: '#0C1520',
    accentText: '#8A6D1F',
    controlOn: '#3D4E63',
    success: '#1E8A4C',
    warning: '#B45F06',
    error: '#C93A3A',
    info: '#2F6FB8',
    shadow: 'rgba(12, 21, 32, 0.12)',
  },
};

/*
 * For inline styles and react-select: CSS variables, so they follow the active theme
 * without a re-render. Don't feed these to AntD seed tokens; use PALETTE there.
 */

// Surfaces
export const COLOR_BG_CANVAS = 'var(--color-canvas)';
export const COLOR_BG_SUNKEN = 'var(--color-sunken)';
export const COLOR_BG_INPUT = 'var(--color-input)';
export const COLOR_BG_CARD = 'var(--color-card)';
export const COLOR_BG_RAISED = 'var(--color-raised)';
export const COLOR_BG_MUTED = 'var(--color-muted)';

// Lines
export const COLOR_BORDER = 'var(--color-line)';
export const COLOR_BORDER_STRONG = 'var(--color-line-strong)';

// Text
export const COLOR_TEXT_PRIMARY = 'var(--color-ink)';
export const COLOR_TEXT_SECONDARY = 'var(--color-ink-2)';
export const COLOR_TEXT_TERTIARY = 'var(--color-ink-3)';
export const COLOR_DISABLED = 'var(--color-disabled)';

// The one forward action
export const COLOR_ACCENT = 'var(--color-gold)';
export const COLOR_ACCENT_HOVER = 'var(--color-gold-hover)';
export const COLOR_ACCENT_ON = 'var(--color-gold-on)';
export const COLOR_ACCENT_TEXT = 'var(--color-gold-ink)';

// A ticked checkbox or an on switch is a strong neutral, never gold or green
export const COLOR_CONTROL_ON = 'var(--color-control-on)';

// Status (always with a word)
export const COLOR_SUCCESS = 'var(--color-success)';
export const COLOR_WARNING = 'var(--color-warning)';
export const COLOR_ERROR = 'var(--color-error)';
export const COLOR_INFO = 'var(--color-info)';

export const COLOR_SHADOW = 'var(--color-shadow)';

export const ZINDEX_HEADER = 1;
export const ZINDEX_MENU = ZINDEX_HEADER + 3;
export const ZINDEX_SELECTBOX = ZINDEX_MENU + 10;

export const HEIGHT_FORM_ITEM = 40;
