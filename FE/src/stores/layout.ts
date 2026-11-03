import { create } from 'zustand';

export type NavigateItem = {
  id: string;
  shouldNavigate: boolean;
};

type LayoutState = {
  /** URL segment → label: a record's id → its code, set by the open page (useBreadcrumb). */
  breadcrumbs: Record<string, string>;
  /** The open page's current tab, the trail's last part (useBreadcrumb); null when it has none. */
  breadcrumbTab: string | null;
  /** One entry per mounted form; a form with unsaved changes sets shouldNavigate false. */
  navigateItems: NavigateItem[];
};

type LayoutAction = {
  setBreadcrumbItem: (segment: string, displayName: string) => void;
  removeBreadcrumbItem: (segment: string) => void;
  setBreadcrumbTab: (tab: string | null) => void;
  setNavigateItem: (item: NavigateItem) => void;
  removeNavigateItem: (id: string) => void;
  resetNavigateItems: () => void;
  hasUnsavedChanges: () => boolean;
  reset: () => void;
};

const initialState: LayoutState = {
  breadcrumbs: {},
  breadcrumbTab: null,
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
  setBreadcrumbTab: (tab) => set({ breadcrumbTab: tab }),
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
