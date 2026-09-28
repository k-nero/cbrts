/*
 * EquiFreight colours (DESIGN.md). Navy surfaces, gold only for the one forward action,
 * status always in tone plus word. The same values are CSS variables in index.css and
 * AntD tokens in config/themeConfig.ts; keep the three in step.
 */

// Surfaces
export const COLOR_BG_CANVAS = '#0C1520';
export const COLOR_BG_SUNKEN = '#09111A';
export const COLOR_BG_INPUT = '#0E1826';
export const COLOR_BG_CARD = '#111B2C';
export const COLOR_BG_RAISED = '#15223A';
export const COLOR_BG_MUTED = '#182538';

// Lines
export const COLOR_BORDER = '#1C2E44';
export const COLOR_BORDER_STRONG = '#2A4266';

// Text
export const COLOR_TEXT_PRIMARY = '#EDE9E1';
export const COLOR_TEXT_SECONDARY = '#B3BFCC';
export const COLOR_TEXT_TERTIARY = '#7A8FA3';
export const COLOR_DISABLED = '#4A5B70';

// The one forward action
export const COLOR_ACCENT = '#C9AA5A';
export const COLOR_ACCENT_HOVER = '#D6B96B';
export const COLOR_ACCENT_ON = '#0C1520';
export const COLOR_ACCENT_TEXT = '#D9BD72';

// A ticked checkbox or an on switch is a strong neutral, never gold or green
export const COLOR_CONTROL_ON = '#B3BFCC';

// Status (always with a word)
export const COLOR_SUCCESS = '#5DC688';
export const COLOR_WARNING = '#FDB47A';
export const COLOR_ERROR = '#EF6B6B';
export const COLOR_INFO = '#7FB0E8';

export const COLOR_SHADOW = 'rgba(0, 0, 0, 0.4)';

export const ZINDEX_HEADER = 1;
export const ZINDEX_MENU = ZINDEX_HEADER + 3;
export const ZINDEX_SELECTBOX = ZINDEX_MENU + 10;

export const HEIGHT_FORM_ITEM = 40;
