import React from 'react';

type UseApplyColumnWidthsOptions = {
  resizableEnabled: boolean;
  isResizing: boolean;
  dataSourceLength: number;
  visibleColumnFingerprint: string;
  widthsVersion: number;
  tableRootRef: React.RefObject<HTMLElement | null>;
  applyWidthsToDom: () => void;
  /**
   * Called in the same frame, immediately after the `<col>` widths are written. The
   * resize overlay measures its handle positions here: reading layout right after the
   * write forces a synchronous reflow, so the measurement already reflects the new
   * widths — no second rAF and no cross-hook race.
   */
  onWidthsApplied?: () => void;
};

/**
 * Column widths are owned by a ref and written straight to the DOM. Ant, however, owns
 * the `<colgroup>` and repaints `<col>` widths from the column defs on its own renders
 * (data change, pagination, sort, expand). This hook re-asserts the ref widths onto the
 * DOM after every such layout:
 *
 * 1. A layout effect (keyed to the structural inputs) reapplies after each React render.
 * 2. A MutationObserver on the table container catches Ant-internal DOM rebuilds that do
 *    not flow through a React render of this component (e.g. pagination).
 *
 * Both bail while a resize drag is in flight — the drag commit already wrote the DOM and
 * is authoritative.
 */
export const useApplyColumnWidths = ({
  resizableEnabled,
  isResizing,
  dataSourceLength,
  visibleColumnFingerprint,
  widthsVersion,
  tableRootRef,
  applyWidthsToDom,
  onWidthsApplied,
}: UseApplyColumnWidthsOptions): void => {
  const isResizingRef = React.useRef(isResizing);
  isResizingRef.current = isResizing;

  // Kept in a ref so adding the measure callback never re-subscribes the effects below.
  const onWidthsAppliedRef = React.useRef(onWidthsApplied);
  onWidthsAppliedRef.current = onWidthsApplied;

  React.useLayoutEffect(() => {
    if (!resizableEnabled || isResizing) {
      return undefined;
    }
    let cancelled = false;
    // One frame after layout so Ant's colgroup exists/has settled before we write.
    const rafId = requestAnimationFrame(() => {
      if (!cancelled) {
        applyWidthsToDom();
        onWidthsAppliedRef.current?.();
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [
    applyWidthsToDom,
    dataSourceLength,
    isResizing,
    resizableEnabled,
    visibleColumnFingerprint,
    widthsVersion,
  ]);

  React.useEffect(() => {
    if (!resizableEnabled) {
      return undefined;
    }
    const root = tableRootRef.current;
    const container = root?.querySelector('.ant-table-container');
    if (!container) {
      return undefined;
    }

    let rafId = 0;
    const observer = new MutationObserver(() => {
      if (isResizingRef.current || rafId) {
        return;
      }
      // Coalesce bursts (e.g. a full page of rows re-rendering) into one reapply.
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        if (!isResizingRef.current) {
          applyWidthsToDom();
          onWidthsAppliedRef.current?.();
        }
      });
    });
    // Width writes set styles only (no childList change), so this never self-triggers.
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [applyWidthsToDom, resizableEnabled, tableRootRef, visibleColumnFingerprint]);
};
