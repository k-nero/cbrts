import { create } from 'zustand';

export type NavigateItem = {
  id: string;
  shouldNavigate: boolean;
};

export type BreadcrumbOverrideItem = {
  key: string;
  label: string;
  href?: string;
};

type LayoutState = {
  /** URL segment → label; segments not listed fall back to dashToTitle(segment). */
  breadcrumbs: Record<string, string>;
  breadcrumbOverride: BreadcrumbOverrideItem[] | null;
  /** One entry per mounted form; a form with unsaved changes sets shouldNavigate false. */
  navigateItems: NavigateItem[];
};

type LayoutAction = {
  setBreadcrumbItem: (segment: string, displayName: string) => void;
  removeBreadcrumbItem: (segment: string) => void;
  setBreadcrumbOverride: (items: BreadcrumbOverrideItem[] | null) => void;
  setNavigateItem: (item: NavigateItem) => void;
  removeNavigateItem: (id: string) => void;
  resetNavigateItems: () => void;
  hasUnsavedChanges: () => boolean;
  reset: () => void;
};

const initialState: LayoutState = {
  breadcrumbs: {
    staff: '',
    users: 'Users & roles',
    'audit-log': 'Audit log',
    'customer-notes': 'Customer notes',
    'fleet-calendar': 'Fleet calendar',
  },
  breadcrumbOverride: null,
  navigateItems: [],
};

export const useLayoutStore = create<LayoutState & LayoutAction>((set, get) => ({
  ...initialState,
  setBreadcrumbItem: (segment, displayName) =>
    set((state) => ({ breadcrumbs: { ...state.breadcrumbs, [segment]: displayName } })),
  removeBreadcrumbItem: (segment) =>
    set((state) => {
      const breadcrumbs = { ...state.breadcrumbs };
      delete breadcrumbs[segment];
      return { breadcrumbs };
    }),
  setBreadcrumbOverride: (items) => set({ breadcrumbOverride: items }),
  setNavigateItem: (item) =>
    set((state) => {
      const index = state.navigateItems.findIndex((nav) => nav.id === item.id);
      if (index < 0) return { navigateItems: [...state.navigateItems, item] };
      const updated = [...state.navigateItems];
      updated[index] = item;
      return { navigateItems: updated };
    }),
  removeNavigateItem: (id) =>
    set((state) => ({ navigateItems: state.navigateItems.filter((n) => n.id !== id) })),
  resetNavigateItems: () => set({ navigateItems: [] }),
  hasUnsavedChanges: () => get().navigateItems.some((item) => !item.shouldNavigate),
  reset: () => set(initialState),
}));
