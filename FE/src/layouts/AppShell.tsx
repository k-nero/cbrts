import { type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogoutOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';

import { useMe } from '../queries';
import { primaryRole, selectRoles, useAuthStore } from '../store/authStore.ts';
import { ROLE_LABEL } from '../types';

const MARK =
    'grid size-[30px] place-items-center rounded-md bg-gold font-display text-[18px] italic text-canvas';

const SIDEBAR = [
    'sticky top-0 flex h-screen w-[248px] shrink-0 flex-col gap-5 self-start',
    'border-r border-line bg-sunken px-4 pt-5 pb-4',
].join(' ');

const ROLE_TAG = [
    'w-fit rounded-full border border-line-strong bg-muted px-2.5 py-1',
    'font-mono text-[11px] tracking-wide text-ink-2 uppercase',
].join(' ');

const BADGE =
    'rounded-full border border-line-strong bg-muted px-2 font-mono text-[11px] text-ink-2';

const USER_BUTTON =
    'flex h-11 items-center gap-2.5 rounded-lg border-t border-line px-2 text-left hover:bg-muted';

const AVATAR =
    'grid size-8 place-items-center rounded-full bg-muted text-[13px] font-medium text-ink-2';

const NAV_ITEM =
    'flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-colors';

export interface NavItem {
    to: string;
    label: string;
    icon: ReactNode;
    /** Counts only items where this person owns the next step; hidden at 0. */
    badge?: number;
}

export interface NavGroup {
    /** Shown only when the group holds more than one item (DESIGN.md, Staff sidebar). */
    label?: string;
    items: readonly NavItem[];
}

export interface AppShellProps {
    navGroups: readonly NavGroup[];
    children: ReactNode;
}

export function Brand() {
    return (
        <div className="flex items-center gap-2.5">
            <span className={MARK}>Eq</span>
            <span className="font-display text-[18px] text-ink">EquiFreight</span>
        </div>
    );
}

/**
 * The staff shell: a 248 px sunken sidebar (brand, the signed-in role as a tag, the role's own
 * items, the user button pinned at the foot) and the workspace. Pages render their own top bar.
 */
export default function AppShell({ navGroups, children }: AppShellProps) {
    const navigate = useNavigate();
    const logout = useAuthStore((s) => s.logout);
    const role = primaryRole(useAuthStore(selectRoles));
    const me = useMe().data ?? null;

    // Family name first, given name last ("Vũ Hải Yến" → "VY").
    const given = me?.firstName.split(' ').at(-1) ?? '';
    const initials = me !== null ? `${me.lastName.at(0) ?? ''}${given.at(0) ?? ''}` : '?';
    const displayName = me !== null ? `${me.lastName} ${me.firstName}` : 'Loading…';

    return (
        <div className="flex min-h-screen bg-canvas">
            <aside className={SIDEBAR}>
                <div className="flex flex-col gap-2.5">
                    <Brand />
                    {role !== null ? <span className={ROLE_TAG}>{ROLE_LABEL[role]}</span> : null}
                </div>

                <nav className="flex flex-1 flex-col gap-4 overflow-y-auto">
                    {navGroups.map((group, gi) => (
                        <div key={group.label ?? gi} className="flex flex-col gap-0.5">
                            {group.label !== undefined && group.items.length > 1 ? (
                                <div className="px-3 pb-1.5 text-[13px] text-ink-3">
                                    {group.label}
                                </div>
                            ) : null}
                            {group.items.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={({ isActive }) =>
                                        [
                                            NAV_ITEM,
                                            isActive
                                                ? 'bg-muted text-gold-ink'
                                                : 'text-ink-2 hover:bg-muted hover:text-ink',
                                        ].join(' ')
                                    }
                                >
                                    <span className="inline-flex w-[18px] justify-center text-[16px]">
                                        {item.icon}
                                    </span>
                                    <span className="flex-1">{item.label}</span>
                                    {item.badge !== undefined && item.badge > 0 ? (
                                        <span className={BADGE}>
                                            {item.badge > 99 ? '99+' : item.badge}
                                        </span>
                                    ) : null}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                <Dropdown
                    trigger={['click']}
                    placement="topLeft"
                    menu={{
                        items: [
                            {
                                key: 'logout',
                                icon: <LogoutOutlined />,
                                label: 'Sign out',
                                onClick: () => {
                                    logout();
                                    navigate('/login');
                                },
                            },
                        ],
                    }}
                >
                    <button type="button" className={USER_BUTTON}>
                        <span className={AVATAR}>{initials.toUpperCase()}</span>
                        <span className="flex-1 truncate text-[13px] font-medium text-ink">
                            {displayName}
                        </span>
                    </button>
                </Dropdown>
            </aside>

            <main className="flex min-w-0 flex-1 flex-col">{children}</main>
        </div>
    );
}
