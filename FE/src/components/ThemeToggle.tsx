import { FC } from 'react';
import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';

import { useThemeStore } from '@/stores/themeStore';

// A native button: AntD's <Button> CSS overrides Tailwind tone and border classes.
const BUTTON = [
  'grid size-8 cursor-pointer place-items-center rounded-full border border-line',
  'bg-transparent text-[14px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink',
].join(' ');

/** Flips light/dark. With no pick yet, the app follows the browser's colour scheme. */
const ThemeToggle: FC = () => {
  const mode = useThemeStore((state) => state.mode);
  const toggle = useThemeStore((state) => state.toggle);
  const label = mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <Tooltip title={label}>
      <button type="button" className={BUTTON} onClick={toggle} aria-label={label}>
        {mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
      </button>
    </Tooltip>
  );
};

export default ThemeToggle;
