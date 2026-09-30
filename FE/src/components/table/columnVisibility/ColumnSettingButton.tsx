import React from 'react';
import type { TableColumnsType } from 'antd';
import { Button, Checkbox, Popover, Space, Tooltip } from 'antd';

import { resolveColumnKey } from '../core/columns';
import type { ColumnSettingsLabels } from '../types';
import { TABLE_CSS_PREFIX } from '../types';

const DEFAULT_COLUMN_SETTINGS_LABELS: Required<ColumnSettingsLabels> = {
  showAll: 'Show All',
  hideAll: 'Hide All',
  reset: 'Reset to Default',
  resetWithWidths: 'Reset columns & widths',
  popoverTitle: 'Column Settings',
  triggerTooltip: 'Show/Hide Columns',
};

export interface IColumnSettingButtonProps<T> {
  columns: TableColumnsType<T>;
  columnVisibility: Record<string, boolean>;
  onToggle: (key: string) => void;
  onReset?: () => void;
  onShowAll?: () => void;
  onHideAll?: () => void;
  showResetButton?: boolean;
  ignoreKeys?: Set<string>;
  resetIncludesColumnWidths?: boolean;
  labels?: {
    showAll?: string;
    hideAll?: string;
    reset?: string;
    resetWithWidths?: string;
    popoverTitle?: string;
    triggerTooltip?: string;
  };
}

type FlatColumnEntry = { key: string; title: React.ReactNode; index: number };
type AnyColumn<T> = TableColumnsType<T>[number];

const ColumnsIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block' }}
  >
    <rect x="0" y="0" width="5" height="16" rx="0.5" fill="currentColor" />
    <rect x="5.5" y="0" width="5" height="16" rx="0.5" fill="currentColor" />
    <rect x="11" y="0" width="5" height="16" rx="0.5" fill="currentColor" />
  </svg>
);

const flattenColumns = <T,>(columns: TableColumnsType<T>): FlatColumnEntry[] => {
  const flat: FlatColumnEntry[] = [];
  let currentIndex = 1;

  const visit = (node: AnyColumn<T>, path: number[]) => {
    if ('children' in node && Array.isArray(node.children)) {
      node.children.forEach((child: AnyColumn<T>, childIndex: number) =>
        visit(child, [...path, childIndex]),
      );
      return;
    }
    flat.push({
      key: resolveColumnKey(node, path),
      title: typeof node.title === 'function' ? null : node.title,
      index: currentIndex,
    });
    currentIndex += 1;
  };

  columns.forEach((col, index) => visit(col, [index]));
  return flat;
};

const ColumnSettingButton = <T,>({
  columns,
  columnVisibility,
  onToggle,
  onReset,
  onShowAll,
  onHideAll,
  showResetButton = true,
  ignoreKeys,
  resetIncludesColumnWidths = false,
  labels: labelsProp,
}: IColumnSettingButtonProps<T>) => {
  const labels = React.useMemo(
    () => ({ ...DEFAULT_COLUMN_SETTINGS_LABELS, ...labelsProp }),
    [labelsProp],
  );
  const flatColumns = React.useMemo(() => flattenColumns(columns), [columns]);
  const triggerClassName = `${TABLE_CSS_PREFIX}-column-settings-trigger`;
  const popoverClassName = `${TABLE_CSS_PREFIX}-column-settings-popover`;

  const content = (
    <Space orientation="vertical" style={{ width: '100%' }} size="small">
      {onShowAll && onHideAll && (
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
          <Button type="link" size="small" onClick={onShowAll} style={{ padding: 0 }}>
            {labels.showAll}
          </Button>
          <Button type="link" size="small" onClick={onHideAll} style={{ padding: 0 }}>
            {labels.hideAll}
          </Button>
        </Space>
      )}
      <div style={{ minWidth: 200, maxHeight: 400, overflowY: 'auto' }}>
        {flatColumns.map((col) => {
          const { key, title, index } = col;
          const isEmptyTitle =
            title == null || (typeof title === 'string' && title.trim().length === 0);
          const displayTitle = isEmptyTitle ? `#${index}` : title;
          if (ignoreKeys?.has(key)) {
            return null;
          }
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center' }}>
              <Checkbox
                checked={columnVisibility[key] ?? true}
                onChange={() => onToggle(key)}
                style={{ width: '100%' }}
              >
                {displayTitle}
              </Checkbox>
            </div>
          );
        })}
      </div>
      {showResetButton && onReset && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-line)' }}>
          <Button type="link" size="small" onClick={onReset} style={{ padding: 0, width: '100%' }}>
            {resetIncludesColumnWidths ? labels.resetWithWidths : labels.reset}
          </Button>
        </div>
      )}
    </Space>
  );

  return (
    <Popover
      content={content}
      title={labels.popoverTitle}
      trigger="click"
      placement="bottomRight"
      classNames={{ root: popoverClassName }}
    >
      <Tooltip title={labels.triggerTooltip}>
        <Button type="text" className={triggerClassName}>
          <ColumnsIcon />
        </Button>
      </Tooltip>
    </Popover>
  );
};

export default ColumnSettingButton;
