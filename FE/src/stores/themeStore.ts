import { create } from 'zustand';

import type { ThemeMode } from '@/constant/color';

const STORAGE_KEY = 'ef.theme';

/** Light is the presented theme (DESIGN.md); Dark is an explicit pick from the toggle. */
const DEFAULT_MODE: ThemeMode = 'light';

function readStorage(): ThemeMode | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'light' || raw === 'dark' ? raw : null;
  } catch {
    return null;
  }
}

function writeStorage(mode: ThemeMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
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
  /** What's on screen: the user's pick, else Light. */
  mode: ThemeMode;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: readStorage() ?? DEFAULT_MODE,
  toggle: () => {
    const next: ThemeMode = get().mode === 'dark' ? 'light' : 'dark';
    writeStorage(next);
    set({ mode: next });
  },
}));

applyToDocument(useThemeStore.getState().mode);
useThemeStore.subscribe((state) => applyToDocument(state.mode));
