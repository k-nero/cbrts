import { FC } from 'react';
import { Tooltip } from 'antd';

import { Icon } from './ui';

import { useThemeStore } from '@/stores/themeStore';

// A native button: AntD's <Button> CSS overrides Tailwind tone and border classes.
const BUTTON = [
  'grid size-9 cursor-pointer place-items-center rounded-md border border-line-strong',
  'bg-transparent text-ink-2 transition-colors hover:bg-muted hover:text-ink',
].join(' ');

/** Flips Light (the presented theme) and Dark (DESIGN.md, App header: 36 px, Rule border). */
const ThemeToggle: FC = () => {
  const mode = useThemeStore((state) => state.mode);
  const toggle = useThemeStore((state) => state.toggle);
  const label = mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <Tooltip title={label}>
      <button type="button" className={BUTTON} onClick={toggle} aria-label={label}>
        <Icon name={mode === 'dark' ? 'sun' : 'moon'} size={18} />
      </button>
    </Tooltip>
  );
};

export default ThemeToggle;
