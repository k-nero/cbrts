import type { FC } from 'react';

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
