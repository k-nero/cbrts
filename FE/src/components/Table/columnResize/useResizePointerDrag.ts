import React from 'react';
import type { TableColumnsType } from 'antd';

import { isTableIgnoredColumnKey } from '../core/columns';
import { TABLE_CSS_PREFIX } from '../types';
import { buildColumnResizeFloorsMap } from './columns';
import { measureColumnHeaderEdges } from './dom';

export type ColumnResizeDrag = {
  startResize: (columnKey: string, pointerClientX: number) => void;
  isResizing: boolean;
};

type ResizePointerApi = {
  getColumnWidth: (columnKey: string) => number;
  resizeColumn: (columnKey: string, width: number) => void;
};

type UseResizePointerDragOptions<T> = {
  minWidth: number;
  visibleColumns: TableColumnsType<T>;
  resize: ResizePointerApi;
  tableRootRef?: React.RefObject<HTMLElement | null>;
  ignoredColumnKeys?: ReadonlySet<string>;
};

type DragContext = {
  columnKey: string;
  startClientX: number;
  startWidth: number;
  effectiveMinWidth: number;
  guideEl: HTMLElement | null;
};

const resizingClass = `${TABLE_CSS_PREFIX}-resizing`;
const guideClass = `${TABLE_CSS_PREFIX}-resize-guide`;

const resetResizeDragBodyStyle = (): void => {
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
};

/**
 * Google-Sheets-style column resize: during the drag only a guideline moves (via a
 * cheap DOM transform — no React state per frame, so the table never re-lays-out or
 * drops frames with many rows). On mouse up the width is committed through
 * `resizeColumn`, which mutates the width ref and writes the `<col>`/`<table>` widths
 * straight to the DOM — still no React re-render, so neighbours never reflow and there
 * is no commit-time flicker.
 */
export const useResizePointerDrag = <T>({
  minWidth,
  visibleColumns,
  resize,
  tableRootRef,
  ignoredColumnKeys = new Set(),
}: UseResizePointerDragOptions<T>) => {
  const { getColumnWidth, resizeColumn } = resize;

  const [isResizing, setIsResizing] = React.useState(false);

  const dragRef = React.useRef<DragContext | null>(null);
  const getColumnWidthRef = React.useRef(getColumnWidth);
  const resizeColumnRef = React.useRef(resizeColumn);

  getColumnWidthRef.current = getColumnWidth;
  resizeColumnRef.current = resizeColumn;

  const resizeFloors = React.useMemo(
    () => buildColumnResizeFloorsMap(visibleColumns, minWidth),
    [visibleColumns, minWidth],
  );

  const pendingPointerXRef = React.useRef<number | null>(null);
  const moveRafRef = React.useRef(0);

  const removeGuide = React.useCallback(() => {
    const guideEl = dragRef.current?.guideEl;
    if (guideEl?.parentNode) {
      guideEl.parentNode.removeChild(guideEl);
    }
  }, []);

  const startResize = React.useCallback(
    (columnKey: string, pointerClientX: number) => {
      if (isTableIgnoredColumnKey(columnKey, ignoredColumnKeys)) {
        return;
      }
      const root = tableRootRef?.current;

      const edges = root ? measureColumnHeaderEdges(root, columnKey) : null;
      const edgeLeftClientX = edges?.left ?? pointerClientX;
      const paintedWidth = edges ? edges.right - edges.left : undefined;
      const startWidth = paintedWidth ?? getColumnWidthRef.current(columnKey);

      const activeColumn = visibleColumns.find((col) => col.key === columnKey);
      const effectiveMinWidth =
        (activeColumn as { minWidth?: number } | undefined)?.minWidth ??
        (resizeFloors[columnKey] || minWidth);

      // Build a fixed-position guideline anchored at the column's right edge. It is
      // moved imperatively (transform) during the drag, never through React state.
      let guideEl: HTMLElement | null = null;
      const tableEl = root?.querySelector<HTMLElement>('.ant-table-container') ?? root;
      const tableRect = tableEl?.getBoundingClientRect();
      if (tableRect) {
        guideEl = document.createElement('div');
        guideEl.className = guideClass;
        guideEl.style.left = `${edgeLeftClientX + startWidth}px`;
        guideEl.style.top = `${tableRect.top}px`;
        guideEl.style.height = `${tableRect.height}px`;
        guideEl.style.transform = 'translateX(0px)';
        document.body.appendChild(guideEl);
      }

      dragRef.current = {
        columnKey,
        startClientX: pointerClientX,
        startWidth,
        effectiveMinWidth,
        guideEl,
      };
      setIsResizing(true);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [ignoredColumnKeys, minWidth, resizeFloors, tableRootRef, visibleColumns],
  );

  React.useEffect(() => {
    if (!isResizing) {
      return undefined;
    }

    const cancelPendingMove = () => {
      if (moveRafRef.current) {
        cancelAnimationFrame(moveRafRef.current);
        moveRafRef.current = 0;
      }
      pendingPointerXRef.current = null;
    };

    const flushPendingMove = () => {
      moveRafRef.current = 0;
      const x = pendingPointerXRef.current;
      pendingPointerXRef.current = null;
      const ctx = dragRef.current;
      if (x == null || !ctx?.guideEl) {
        return;
      }
      const deltaX = x - ctx.startClientX;
      const newWidth = Math.max(ctx.effectiveMinWidth, ctx.startWidth + deltaX);
      const actualDelta = newWidth - ctx.startWidth;
      ctx.guideEl.style.transform = `translateX(${actualDelta}px)`;
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!dragRef.current) {
        return;
      }
      // Coalesce high-frequency pointer events down to one guide update per frame.
      pendingPointerXRef.current = event.clientX;
      if (moveRafRef.current) {
        return;
      }
      moveRafRef.current = requestAnimationFrame(flushPendingMove);
    };

    const onMouseUp = (event: MouseEvent) => {
      cancelPendingMove();
      const ctx = dragRef.current;
      if (ctx) {
        const deltaX = event.clientX - ctx.startClientX;
        const finalWidth = Math.max(ctx.effectiveMinWidth, ctx.startWidth + deltaX);
        // Commit width to the ref + DOM. No React state, so nothing re-renders or
        // reflows; the drag delta is authoritative.
        resizeColumnRef.current(ctx.columnKey, finalWidth);
      }
      removeGuide();
      dragRef.current = null;
      setIsResizing(false);
      resetResizeDragBodyStyle();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      cancelPendingMove();
      resetResizeDragBodyStyle();
    };
  }, [isResizing, removeGuide]);

  React.useEffect(
    () => () => {
      removeGuide();
      dragRef.current = null;
      resetResizeDragBodyStyle();
    },
    [removeGuide],
  );

  return {
    drag: { startResize, isResizing },
    wrapperClassName: isResizing ? resizingClass : '',
  };
};
