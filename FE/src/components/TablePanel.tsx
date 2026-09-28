import { type ReactNode } from 'react';

export interface TablePanelProps {
    /** Heading shown at the left of the toolbar band. */
    title?: string | undefined;
    /** Row count rendered as a mono chip next to the title (omit while loading). */
    count?: number | undefined;
    /** Right-aligned toolbar controls (search, filters, primary action). */
    actions?: ReactNode | undefined;
    /** Panel body — the table, plus any error / filter strips that sit under the band. */
    children: ReactNode;
}

/**
 * The shared "Calm Control Room" table surface: a white card with a hairline
 * border and a toolbar band (title · mono count · actions) above the body. Used
 * by {@link CrudTable} and the bespoke list pages so every table reads as the
 * same panel instead of a bare AntD table on the workspace.
 */
export default function TablePanel({ title, count, actions, children }: TablePanelProps) {
    return (
        <div className="bg-card border border-line rounded-xl overflow-hidden">
            <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 border-b border-line">
                <div className="flex items-baseline gap-2 min-w-0">
                    {title !== undefined ? (
                        <h2 className="m-0 truncate font-display text-[18px] font-normal text-ink">
                            {title}
                        </h2>
                    ) : null}
                    {count !== undefined ? (
                        <span className="font-mono text-[12px] text-ink-3">{count}</span>
                    ) : null}
                </div>
                {actions !== undefined ? actions : null}
            </div>
            {children}
        </div>
    );
}
