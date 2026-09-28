import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from 'antd';

import { useAuthStore } from '../store/authStore.ts';
import { Brand } from './AppShell';

const NAV = [
    { to: '/app', label: 'Home', end: true },
    { to: '/app/horses', label: 'My horses', end: false },
    { to: '/app/requests', label: 'My requests', end: false },
];

/** The owner portal: a 64 px header with the customer's own items; staff work in the staff shell. */
export default function CustomerLayout() {
    const navigate = useNavigate();
    const logout = useAuthStore((s) => s.logout);
    return (
        <div className="flex min-h-screen flex-col bg-canvas">
            <header className="flex h-16 items-center justify-between border-b border-line px-10">
                <Brand />
                <nav className="flex items-center gap-1">
                    {NAV.map((n) => (
                        <NavLink
                            key={n.to}
                            to={n.to}
                            end={n.end}
                            className={({ isActive }) =>
                                [
                                    'rounded-lg px-3 py-2 text-[13px] font-medium',
                                    isActive
                                        ? 'bg-muted text-gold-ink'
                                        : 'text-ink-2 hover:text-ink',
                                ].join(' ')
                            }
                        >
                            {n.label}
                        </NavLink>
                    ))}
                </nav>
                <Button
                    type="text"
                    onClick={() => {
                        logout();
                        navigate('/login');
                    }}
                >
                    Sign out
                </Button>
            </header>
            <main className="flex-1">
                <Outlet />
            </main>
        </div>
    );
}
