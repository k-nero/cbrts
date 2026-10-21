import { type FC, type ReactNode } from 'react';

/** One section of the form: its title, why it asks, then its fields. */
export const Section: FC<{ title: string; sub?: string; first?: boolean; children: ReactNode }> = ({
  title,
  sub,
  first,
  children,
}) => (
  <section
    className={first ? 'flex flex-col gap-3.5' : 'flex flex-col gap-3.5 border-t border-line pt-5'}
  >
    <div className="flex flex-col gap-0.5">
      <h4 className="type-h4 m-0 text-ink">{title}</h4>
      {sub && <p className="type-body-s m-0 text-ink-3">{sub}</p>}
    </div>
    {children}
  </section>
);
