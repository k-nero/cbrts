import type { FC, MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { Tooltip } from 'antd';

import { IconButton } from './ui';

import { useThemeStore } from '@/stores/themeStore';

const REVEAL_MS = 520;

/**
 * Swaps the theme with the new one spreading out in a circle from the toggle (index.css,
 * view-transition). Without the View Transitions API, or with reduced motion asked for, it swaps at once.
 */
function revealFrom(button: HTMLElement, swap: () => void) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduced) {
    swap();
    return;
  }

  const { left, top, width, height } = button.getBoundingClientRect();
  const x = left + width / 2;
  const y = top + height / 2;
  // Far enough to cover the corner furthest from the toggle.
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  // flushSync so the snapshot after the callback already holds AntD's re-rendered theme.
  const transition = document.startViewTransition(() => flushSync(swap));
  transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      {
        duration: REVEAL_MS,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        pseudoElement: '::view-transition-new(root)',
      },
    );
  });
}

/** Flips Light (the presented theme) and Dark (DESIGN.md, App header: 36 px, Rule border). */
const ThemeToggle: FC = () => {
  const mode = useThemeStore((state) => state.mode);
  const toggle = useThemeStore((state) => state.toggle);
  const label = mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  const onClick = (event: MouseEvent<HTMLButtonElement>) => revealFrom(event.currentTarget, toggle);

  return (
    <Tooltip title={label}>
      <IconButton icon={mode === 'dark' ? 'sun' : 'moon'} label={label} onClick={onClick} />
    </Tooltip>
  );
};

export default ThemeToggle;
