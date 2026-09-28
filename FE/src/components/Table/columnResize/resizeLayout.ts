import type { TableProps } from 'antd';

import { DEFAULT_COLUMN_RESIZE_MIN_WIDTH, DEFAULT_COLUMN_RESIZE_PERSIST } from '../core/constants';
import type { ResizableColumnsConfig } from '../types';

export type ResolvedResizableConfig = {
  enabled: boolean;
  config: Required<Pick<ResizableColumnsConfig, 'minWidth' | 'persist'>>;
};

export const resolveResizableConfig = (
  resizableColumns?: boolean | ResizableColumnsConfig,
): ResolvedResizableConfig => {
  const defaults = {
    minWidth: DEFAULT_COLUMN_RESIZE_MIN_WIDTH,
    persist: DEFAULT_COLUMN_RESIZE_PERSIST,
  };

  if (resizableColumns === false) {
    return { enabled: false, config: defaults };
  }

  if (resizableColumns === undefined || resizableColumns === true) {
    return { enabled: true, config: defaults };
  }

  return {
    enabled: true,
    config: {
      minWidth: resizableColumns.minWidth ?? defaults.minWidth,
      persist: resizableColumns.persist ?? defaults.persist,
    },
  };
};

export const resolveScrollForResize = (
  scroll: TableProps['scroll'] | undefined,
  resizableEnabled: boolean,
  contentWidth: number,
): TableProps['scroll'] | undefined => {
  if (!resizableEnabled || contentWidth <= 0) {
    return scroll;
  }

  if (!scroll) {
    return { x: contentWidth };
  }

  return { ...scroll, x: contentWidth };
};
