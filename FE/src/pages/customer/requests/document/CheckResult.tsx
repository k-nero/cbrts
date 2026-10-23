import type { FC } from 'react';

import { Callout } from '@/components/ui';
import { type DocumentCheckResponse, ValidityEnum } from '@/interfaces';

export type Outcome = { check?: DocumentCheckResponse; fileName?: string; error?: string };

/** The automatic check's answer, directly under the fields: what it found and what happens next. */
export const CheckResult: FC<{ outcome: Outcome }> = ({ outcome: { check, fileName, error } }) => {
  if (error || !check)
    return (
      <Callout tone="bad" title="Not uploaded">
        {error}
      </Callout>
    );
  if (check.validity === ValidityEnum.RED)
    return (
      <Callout tone="bad" title="Refused: this document fails the rule">
        {`${check.note} Nothing was saved; ${fileName} was not uploaded.`}
      </Callout>
    );
  if (check.validity === ValidityEnum.AMBER)
    return (
      <Callout tone="warn" title="Kept, but it expires in transit">
        {`${check.note} ${fileName} is saved as a new version, but it won't clear; upload one that covers the whole trip.`}
      </Callout>
    );
  return (
    <Callout tone="ok" title="Passes">
      {`${check.note} ${fileName} is saved and sent to your transport specialist for review.`}
    </Callout>
  );
};
