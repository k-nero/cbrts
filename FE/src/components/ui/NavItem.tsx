import type { FC, ReactNode } from 'react';
import { NavLink, type NavLinkProps } from 'react-router-dom';

import { cx } from './tone';

type Props = Omit<NavLinkProps, 'className' | 'children'> & { children: ReactNode };

/** An app header item (DESIGN.md, Nav item): Label S in Mist; active is a Muted Navy pill with a Gold Ink label. */
export const NavItem: FC<Props> = ({ children, ...rest }) => (
  <NavLink
    {...rest}
    className={({ isActive }) =>
      cx(
        'focus-ring type-label-s rounded-md px-3 py-2 no-underline transition-colors',
        isActive ? 'bg-muted text-gold-ink' : 'text-ink-2 hover:text-ink',
      )
    }
  >
    {children}
  </NavLink>
);
