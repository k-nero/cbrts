import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface Crumb {
    to?: string;
    label: string;
}

export interface PageTopBarProps {
    breadcrumbs: readonly Crumb[];
    right?: ReactNode;
}

/**
 * Sticky 56px page header rendered by each page inside `AppShell`. Hosts a
 * breadcrumb on the left and a free-form `right` slot for page-specific
 * controls (building selector, search, avatar, etc.).
 */
export default function PageTopBar({ breadcrumbs, right }: PageTopBarProps) {
    return (
        <header className="sticky top-0 z-10 h-14 bg-canvas border-b border-line flex items-center px-6 gap-4">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
                {breadcrumbs.map((crumb, idx) => {
                    const isLast = idx === breadcrumbs.length - 1;
                    const content =
                        crumb.to !== undefined && !isLast ? (
                            <Link to={crumb.to} className="text-ink-3 hover:text-ink">
                                {crumb.label}
                            </Link>
                        ) : (
                            <span className={isLast ? 'text-ink font-medium' : 'text-ink-3'}>
                                {crumb.label}
                            </span>
                        );
                    return (
                        <span key={`${crumb.label}-${idx}`} className="flex items-center gap-1.5">
                            {content}
                            {!isLast ? <span className="text-ink-3">/</span> : null}
                        </span>
                    );
                })}
            </nav>
            <div className="flex-1" />
            {right !== undefined ? <div className="flex items-center gap-2">{right}</div> : null}
        </header>
    );
}
