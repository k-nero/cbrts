import { create } from 'zustand';

import type { ThemeMode } from '@/constant/color';

const STORAGE_KEY = 'ef.theme';
const media = globalThis.matchMedia?.('(prefers-color-scheme: dark)');

const systemMode = (): ThemeMode => (media?.matches === false ? 'light' : 'dark');

function readStorage(): ThemeMode | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'light' || raw === 'dark' ? raw : null;
  } catch {
    return null;
  }
}

function writeStorage(mode: ThemeMode | null) {
  try {
    if (mode === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Private mode or blocked storage: the choice just lasts for this tab.
  }
}

/** index.css keys the light palette off data-theme; color-scheme themes native scrollbars and inputs. */
function applyToDocument(mode: ThemeMode) {
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.style.colorScheme = mode;
}

interface ThemeState {
  /** The user's explicit pick, or null to follow the browser's prefers-color-scheme. */
  preference: ThemeMode | null;
  /** What's on screen: the preference, else the browser's scheme. */
  mode: ThemeMode;
  toggle: () => void;
}

const initialPreference = readStorage();

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: initialPreference,
  mode: initialPreference ?? systemMode(),
  toggle: () => {
    const next: ThemeMode = get().mode === 'dark' ? 'light' : 'dark';
    // Toggling back to the browser's scheme drops the override, so the app follows it again.
    const preference = next === systemMode() ? null : next;
    writeStorage(preference);
    set({ preference, mode: next });
  },
}));

applyToDocument(useThemeStore.getState().mode);
useThemeStore.subscribe((state) => applyToDocument(state.mode));

media?.addEventListener('change', () => {
  if (useThemeStore.getState().preference === null) useThemeStore.setState({ mode: systemMode() });
});
