import { CSSProperties, ReactNode } from 'react';
import { Tooltip } from 'antd';

import {
  COLOR_BG_INPUT,
  COLOR_BG_SUNKEN,
  COLOR_BORDER_STRONG,
  HEIGHT_FORM_ITEM,
} from '@/constant/color';

interface ReadOnlyFieldDisplayProps {
  value: ReactNode;
  disabled?: boolean;
  minHeight?: string | number;
  showTooltip?: boolean;
  style?: CSSProperties;
}

const ReadOnlyFieldDisplay = ({
  value,
  disabled = false,
  minHeight = HEIGHT_FORM_ITEM,
  showTooltip = false,
  style = {},
}: ReadOnlyFieldDisplayProps) => {
  const defaultStyle: CSSProperties = {
    width: '100%',
    border: disabled ? 'none' : `1px solid ${COLOR_BORDER_STRONG}`,
    minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight,
    borderRadius: '8px',
    padding: '8px 11px',
    backgroundColor: disabled ? COLOR_BG_SUNKEN : COLOR_BG_INPUT,
    lineHeight: '1.5715',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    ...style,
  };

  const content = (
    <div style={defaultStyle}>{value !== null && value !== undefined ? value : ''}</div>
  );

  if (showTooltip && typeof value === 'string') {
    return (
      <Tooltip title={value} placement="topLeft">
        {content}
      </Tooltip>
    );
  }

  return content;
};

export default ReadOnlyFieldDisplay;
