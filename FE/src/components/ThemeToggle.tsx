import { FC } from 'react';
import { Tooltip } from 'antd';

import { IconButton } from './ui';

import { useThemeStore } from '@/stores/themeStore';

/** Flips Light (the presented theme) and Dark (DESIGN.md, App header: 36 px, Rule border). */
const ThemeToggle: FC = () => {
  const mode = useThemeStore((state) => state.mode);
  const toggle = useThemeStore((state) => state.toggle);
  const label = mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <Tooltip title={label}>
      <IconButton icon={mode === 'dark' ? 'sun' : 'moon'} label={label} onClick={toggle} />
    </Tooltip>
  );
};

export default ThemeToggle;
