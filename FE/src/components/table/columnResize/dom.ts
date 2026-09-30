const queryHeaderCells = (root: HTMLElement): NodeListOf<HTMLElement> => {
  const headerSection = root.querySelector('.ant-table-header');
  if (headerSection) {
    const cells = headerSection.querySelectorAll<HTMLElement>('th[data-column-key]');
    if (cells.length) {
      return cells;
    }
  }
  return root.querySelectorAll<HTMLElement>('thead th[data-column-key]');
};

const queryColumnHeaderCell = (root: HTMLElement, columnKey: string): HTMLElement | null =>
  root.querySelector<HTMLElement>(`.ant-table-header th[data-column-key="${columnKey}"]`) ??
  root.querySelector<HTMLElement>(`thead th[data-column-key="${columnKey}"]`);

const queryColumnEdgeCell = (root: HTMLElement, columnKey: string): HTMLElement | null =>
  root.querySelector<HTMLElement>(`tbody td[data-column-key="${columnKey}"]`) ??
  queryColumnHeaderCell(root, columnKey);

export const measureColumnHeaderEdges = (
  tableRoot: HTMLElement,
  columnKey: string,
): { left: number; right: number } | null => {
  const header = queryColumnHeaderCell(tableRoot, columnKey);
  if (!header) {
    return null;
  }
  const rect = header.getBoundingClientRect();
  return {
    left: rect.left,
    right: rect.right,
  };
};

export const measureColumnPaintedWidth = (
  tableRoot: HTMLElement,
  columnKey: string,
): number | null => {
  const edges = measureColumnHeaderEdges(tableRoot, columnKey);
  if (!edges) {
    return null;
  }
  const span = edges.right - edges.left;
  return span > 0 ? span : null;
};

/** `<col>` elements Ant owns and sizes itself (selection checkbox / expand icon). */
const ANT_MANAGED_COL_CLASS = /ant-table-(selection|expand|row-expand)/;

/**
 * Imperatively size each leaf column by writing widths onto the `<col>` elements of
 * every colgroup (header table + body table under `scroll`) and the total width onto
 * every inner `<table>`. This is the source-of-truth → DOM bridge: column widths live
 * in a ref, never in React state, so committing a resize never re-renders the table.
 *
 * `<col>` order matches column order; Ant-managed cols (selection/expand) are skipped
 * so the remaining cols line up with `orderedLeafKeys`. Ignored columns (e.g. `action`)
 * keep their painted width — measured here so the total stays exact and fixed-layout
 * does not redistribute the difference.
 */
export const applyColumnWidthsToDom = (
  tableRoot: HTMLElement,
  orderedLeafKeys: string[],
  ignoredColumnKeys: ReadonlySet<string>,
  widthFor: (columnKey: string) => number,
  selectionWidth: number,
): void => {
  const container = tableRoot.querySelector<HTMLElement>('.ant-table-container') ?? tableRoot;

  const appliedWidth: Record<string, number> = {};
  orderedLeafKeys.forEach((key) => {
    if (ignoredColumnKeys.has(key)) {
      appliedWidth[key] = measureColumnPaintedWidth(tableRoot, key) ?? 0;
    } else {
      appliedWidth[key] = widthFor(key);
    }
  });

  let total =
    orderedLeafKeys.reduce((sum, key) => sum + (appliedWidth[key] ?? 0), 0) + selectionWidth;

  // Spreadsheet-style fill: when the columns are collectively narrower than the scroll
  // viewport, give the slack to the last non-ignored column instead of relying on
  // `min-width: 100%` (which makes fixed-layout redistribute the gap across *every*
  // column — so dragging a divider barely moves it). With one flex column the total
  // equals the viewport exactly, every other column keeps its width, and resizing moves
  // the boundary 1:1. Once the columns overflow the viewport the table scrolls instead.
  const viewport =
    container.querySelector<HTMLElement>('.ant-table-body') ??
    container.querySelector<HTMLElement>('.ant-table-content') ??
    container;
  const available = viewport.clientWidth;
  if (available > 0 && total < available) {
    for (let i = orderedLeafKeys.length - 1; i >= 0; i -= 1) {
      const key = orderedLeafKeys[i];
      if (!ignoredColumnKeys.has(key)) {
        appliedWidth[key] += available - total;
        total = available;
        break;
      }
    }
  }

  container.querySelectorAll<HTMLElement>('colgroup').forEach((colgroup) => {
    let keyIndex = 0;
    Array.from(colgroup.children).forEach((node) => {
      const col = node as HTMLElement;
      if (ANT_MANAGED_COL_CLASS.test(col.getAttribute('class') ?? '')) {
        return;
      }
      const key = orderedLeafKeys[keyIndex];
      keyIndex += 1;
      if (key == null || ignoredColumnKeys.has(key)) {
        return;
      }
      const width = `${appliedWidth[key]}px`;
      col.style.width = width;
      col.style.minWidth = width;
    });
  });

  const totalPx = `${total}px`;
  // `min-width: 100%` stays as a safety net (matches rc-table) in case the viewport
  // measurement is a pixel off; the flex column above already makes total ≈ viewport.
  container.querySelectorAll<HTMLElement>('table').forEach((table) => {
    table.style.width = totalPx;
    table.style.minWidth = '100%';
  });
};

export type ResizeZone = {
  columnKey: string;
  left: number;
};

export type FixedColumnInsets = {
  left: number;
  right: number;
};

export const measureFixedColumnInsets = (tableRoot: HTMLElement): FixedColumnInsets => {
  const rootRect = tableRoot.getBoundingClientRect();
  let left = 0;
  let right = 0;

  tableRoot
    .querySelectorAll<HTMLElement>('.ant-table-header th.ant-table-cell-fix-start')
    .forEach((cell) => {
      const rect = cell.getBoundingClientRect();
      if (rect.width > 0) {
        left = Math.max(left, rect.right - rootRect.left);
      }
    });

  tableRoot
    .querySelectorAll<HTMLElement>('.ant-table-header th.ant-table-cell-fix-end')
    .forEach((cell) => {
      const rect = cell.getBoundingClientRect();
      if (rect.width > 0) {
        right = Math.max(right, rootRect.right - rect.left);
      }
    });

  return { left, right };
};

export const measureResizeZones = (
  tableRoot: HTMLElement,
  ignoredColumnKeys: ReadonlySet<string> = new Set(),
): {
  zones: ResizeZone[];
  overlayTop: number;
  overlayHeight: number;
  fixedInsets: FixedColumnInsets;
} => {
  const tableEl =
    tableRoot.querySelector<HTMLElement>('.ant-table-container') ??
    tableRoot.querySelector<HTMLElement>('.ant-table');

  const headers = queryHeaderCells(tableRoot);
  const fixedInsets = measureFixedColumnInsets(tableRoot);
  if (!tableEl || !headers.length) {
    return { zones: [], overlayTop: 0, overlayHeight: 0, fixedInsets };
  }

  const rootRect = tableRoot.getBoundingClientRect();
  const tableRect = tableEl.getBoundingClientRect();
  const columnKeys = new Set<string>();

  headers.forEach((header) => {
    const { columnKey } = header.dataset;
    if (columnKey) {
      columnKeys.add(columnKey);
    }
  });

  const zones: ResizeZone[] = [];
  const scrollableRight = rootRect.width - fixedInsets.right;

  columnKeys.forEach((columnKey) => {
    if (ignoredColumnKeys.has(columnKey)) {
      return;
    }
    const edgeCell = queryColumnEdgeCell(tableRoot, columnKey);
    if (!edgeCell) {
      return;
    }
    const rect = edgeCell.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }
    const left = rect.right - rootRect.left;
    if (left <= fixedInsets.left + 1 || left >= scrollableRight - 1) {
      return;
    }
    zones.push({ columnKey, left });
  });

  return {
    zones,
    overlayTop: tableRect.top - rootRect.top,
    overlayHeight: tableRect.height,
    fixedInsets,
  };
};
