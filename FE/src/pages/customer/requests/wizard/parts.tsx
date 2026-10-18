import type { FC, ReactNode } from 'react';

import { Callout } from '@/components/ui';

/** One or several sentences from the server, said once above a step's footer. */
export const StepRefusal: FC<{ messages: string[]; title?: string }> = ({ messages, title }) => {
  if (messages.length === 0) return null;
  const [first, ...rest] = messages;
  return (
    <div data-refusal>
      <Callout tone="bad" title={rest.length && title ? title : first}>
        {rest.length > 0 && (
          <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
            {(title ? messages : rest).map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
      </Callout>
    </div>
  );
};

/** A group of choices on a step, with its heading and why it is asked. */
export const Group: FC<{ title: string; sub?: string; error?: string; children: ReactNode }> = ({
  title,
  sub,
  error,
  children,
}) => (
  <div className="flex flex-col gap-3">
    <div className="flex flex-col gap-0.5">
      <h3 className="type-h4 m-0 text-ink">{title}</h3>
      {sub && <p className="type-body-s m-0 text-ink-3">{sub}</p>}
    </div>
    {children}
    {error && (
      <p data-refusal className="type-body-s m-0 text-bad">
        {error}
      </p>
    )}
  </div>
);
