import { useEffect } from 'react';

import { useLayoutStore } from '@/stores/layout';

/**
 * Names the open page in the staff top bar's trail (DESIGN.md: the breadcrumb is the way back, as in
 * "Jobs / CBRT-2026-043 / Trip"). `id` is the record's URL segment and `label` its code, shown in
 * place of the raw id once the record has loaded; `tab` is the tab open now, added as the last part.
 */
export function useBreadcrumb({
  id,
  label,
  tab,
}: {
  id?: string;
  label?: string | null;
  tab?: string;
}) {
  const setItem = useLayoutStore((s) => s.setBreadcrumbItem);
  const removeItem = useLayoutStore((s) => s.removeBreadcrumbItem);
  const setTab = useLayoutStore((s) => s.setBreadcrumbTab);

  useEffect(() => {
    if (!id || !label) return;
    setItem(id, label);
    return () => removeItem(id);
  }, [id, label, setItem, removeItem]);

  useEffect(() => {
    if (!tab) return;
    setTab(tab);
    return () => setTab(null);
  }, [tab, setTab]);
}
