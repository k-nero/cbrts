import React from 'react';

import { TABLE_CSS_PREFIX } from '../types';
import type { FixedColumnInsets, ResizeZone } from './dom';
import { measureResizeZones } from './dom';
import type { ColumnResizeDrag } from './useColumnResize';

const p = TABLE_CSS_PREFIX;

type HeaderObstructionRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

const isFixedOrStickyHeader = (header: HTMLElement): boolean => {
  if (
    header.classList.contains('ant-table-cell-fix') ||
    header.classList.contains('ant-table-cell-fix-start') ||
    header.classList.contains('ant-table-cell-fix-end')
  ) {
    return true;
  }
  return globalThis.getComputedStyle(header).position === 'sticky';
};

const collectHeaderObstructionRects = (tableRoot: HTMLElement): HeaderObstructionRect[] => {
  const headers = tableRoot.querySelectorAll<HTMLElement>(
    '.ant-table-header th[data-column-key], .ant-table-header th.ant-table-cell-fix',
  );
  const rects: HeaderObstructionRect[] = [];
  headers.forEach((header) => {
    if (!isFixedOrStickyHeader(header)) {
      return;
    }
    const rect = header.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }
    rects.push({
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
    });
  });
  return rects;
};

const isHandleObstructed = (
  tableRoot: HTMLElement,
  handleLeftInRoot: number,
  overlayTopInRoot: number,
  overlayHeight: number,
  fixedInsets: FixedColumnInsets,
): boolean => {
  const rootRect = tableRoot.getBoundingClientRect();
  const scrollableRight = rootRect.width - fixedInsets.right;

  if (handleLeftInRoot <= fixedInsets.left + 1 || handleLeftInRoot >= scrollableRight - 1) {
    return true;
  }

  const obstructionRects = collectHeaderObstructionRects(tableRoot);
  if (obstructionRects.length === 0) {
    return false;
  }

  const probeX = rootRect.left + handleLeftInRoot;
  const probeY = rootRect.top + overlayTopInRoot + Math.max(8, Math.min(overlayHeight / 2, 24));
  return obstructionRects.some(
    (rect) =>
      probeX >= rect.left && probeX <= rect.right && probeY >= rect.top && probeY <= rect.bottom,
  );
};

type ColumnResizeOverlayProps = {
  tableRootRef: React.RefObject<HTMLElement | null>;
  /**
   * The overlay publishes its `measureZones` into this ref so the width-apply hook can
   * re-measure handle positions in the same frame it writes the column widths. This is
   * what lets the handles track the columns without the overlay running its own
   * (racing) measurement pass.
   */
  measureRef: React.RefObject<() => void>;
  drag: ColumnResizeDrag;
  ignoredColumnKeys?: ReadonlySet<string>;
};

const ColumnResizeOverlay: React.FC<ColumnResizeOverlayProps> = ({
  tableRootRef,
  measureRef,
  drag,
  ignoredColumnKeys = new Set(),
}) => {
  const [zones, setZones] = React.useState<ResizeZone[]>([]);
  const [overlayBox, setOverlayBox] = React.useState({ top: 0, height: 0 });
  const [fixedInsets, setFixedInsets] = React.useState<FixedColumnInsets>({ left: 0, right: 0 });

  const measureZones = React.useCallback(() => {
    const root = tableRootRef.current;
    if (!root) {
      setZones([]);
      setFixedInsets({ left: 0, right: 0 });
      return;
    }
    const measured = measureResizeZones(root, ignoredColumnKeys);
    setZones(measured.zones);
    setOverlayBox({ top: measured.overlayTop, height: measured.overlayHeight });
    setFixedInsets(measured.fixedInsets);
  }, [ignoredColumnKeys, tableRootRef]);

  const startResizeFromClientX = React.useCallback(
    (columnKey: string, clientX: number) => {
      drag.startResize(columnKey, clientX);
    },
    [drag],
  );

  const visibleZones = React.useMemo(() => {
    const root = tableRootRef.current;
    if (!root || zones.length === 0) {
      return zones;
    }
    return zones.filter(
      (zone) =>
        !isHandleObstructed(root, zone.left, overlayBox.top, overlayBox.height, fixedInsets),
    );
  }, [fixedInsets, overlayBox.height, overlayBox.top, tableRootRef, zones]);

  // Publish the measurement so the width-apply hook can re-measure right after it writes
  // the column widths (same frame). Layout/visibility/reset re-measures all flow through
  // there, so the overlay no longer needs its own width-change measurement effect.
  React.useLayoutEffect(() => {
    measureRef.current = measureZones;
  }, [measureRef, measureZones]);

  React.useEffect(() => {
    const root = tableRootRef.current;
    if (!root) {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      if (!drag.isResizing) {
        measureZones();
      }
    });
    observer.observe(root);

    const scrollTargets = [
      root.querySelector('.ant-table-body'),
      root.querySelector('.ant-table-header'),
      root.querySelector('.ant-table-content'),
    ].filter(Boolean) as HTMLElement[];

    const onScroll = () => {
      if (!drag.isResizing) {
        measureZones();
      }
    };

    scrollTargets.forEach((el) => el.addEventListener('scroll', onScroll, { passive: true }));
    window.addEventListener('resize', onScroll);

    return () => {
      observer.disconnect();
      scrollTargets.forEach((el) => el.removeEventListener('scroll', onScroll));
      window.removeEventListener('resize', onScroll);
    };
  }, [drag.isResizing, measureZones, tableRootRef]);

  return (
    <div
      className={`${p}-resize-overlay`}
      style={{
        top: overlayBox.top,
        height: overlayBox.height || '100%',
        left: fixedInsets.left,
        right: fixedInsets.right,
      }}
    >
      {!drag.isResizing &&
        visibleZones.map((zone) => (
          <button
            key={zone.columnKey}
            type="button"
            className={`${p}-resize-handle`}
            style={{ left: zone.left - fixedInsets.left }}
            aria-label={`Resize column ${zone.columnKey}`}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              startResizeFromClientX(zone.columnKey, event.clientX);
            }}
          >
            <span className={`${p}-resize-handle-line`} aria-hidden />
          </button>
        ))}
    </div>
  );
};

export default ColumnResizeOverlay;
