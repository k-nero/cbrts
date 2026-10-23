import type { FC } from 'react';
import { lowerFirst } from 'lodash-es';

import { Callout } from '@/components/ui';
import { type DocumentCheckResponse, ValidityEnum } from '@/interfaces';
import { formatDate } from '@/lib/utils';

export type Outcome = { check?: DocumentCheckResponse; fileName?: string; error?: string };

/**
 * The automatic check's answer, directly under the fields (US-F2-09): the value found, the rule and the value that
 * passes, then what happens next. A check that never reached a date rule only has its note.
 */
export const CheckResult: FC<{ outcome: Outcome }> = ({ outcome: { check, fileName, error } }) => {
  if (error || !check)
    return (
      <Callout tone="bad" title="Not uploaded">
        {error}
      </Callout>
    );
  const { validity, note, rule, found, required, renewBy } = check;
  const ruled = rule && found;
  if (validity === ValidityEnum.RED)
    return (
      <Callout tone="bad" title="Refused: this document fails the rule">
        {ruled
          ? `${found}. The rule is “${lowerFirst(rule)}”, so it needs to be ${required}. Nothing was saved; ${fileName} was not uploaded.`
          : `${note} Nothing was saved; ${fileName} was not uploaded.`}
      </Callout>
    );
  if (validity === ValidityEnum.AMBER)
    return (
      <Callout
        tone="warn"
        title={
          renewBy
            ? `Kept, but it expires in transit: replace it by ${formatDate(renewBy)}`
            : 'Kept, but it expires in transit'
        }
      >
        {ruled
          ? `${found}. The rule is “${lowerFirst(rule)}”, so the replacement needs to be ${required}. ${fileName} is saved as a new version, but it won't clear.`
          : `${note} ${fileName} is saved as a new version, but it won't clear; upload one that covers the whole trip.`}
      </Callout>
    );
  return (
    <Callout tone="ok" title={ruled ? `Passes: ${lowerFirst(found)}` : 'Passes'}>
      {ruled
        ? `The rule is “${lowerFirst(rule)}”. ${fileName} is saved and sent to your transport specialist for review.`
        : `${note} ${fileName} is saved and sent to your transport specialist for review.`}
    </Callout>
  );
};
