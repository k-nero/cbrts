import type { FC } from 'react';

import { Chip, Panel, type StatusTone } from '@/components/ui';
import { type ChecklistItem, RegulationRuleKindEnum } from '@/interfaces';

const OUTCOMES: { tone: StatusTone; word: string; text: string }[] = [
  {
    tone: 'ok',
    word: 'Passes',
    text: 'Valid for your travel dates. Goes to your transport specialist for review.',
  },
  {
    tone: 'warn',
    word: 'Expires in transit',
    text: 'Valid today but not for the whole trip, so it is kept and a replacement is needed.',
  },
  {
    tone: 'bad',
    word: 'Refused',
    text: 'Fails the rule for your travel dates, so it is refused and the file is not saved.',
  },
];

/**
 * The rule in words, above the three answers the automatic check can give (DESIGN.md, Document upload). A
 * document with no date rule only has to be uploaded, so it has no answers to list.
 */
export const RulePanel: FC<{ item: ChecklistItem }> = ({ item }) => {
  const dated = item.ruleKind && item.ruleKind !== RegulationRuleKindEnum.PRESENCE_ONLY;
  return (
    <Panel>
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <h2 className="type-h4 m-0 text-ink">What this document must show</h2>
          <p className="type-body-m m-0 text-ink">
            {item.ruleDescription ||
              'No date rule applies. Upload a clear copy; your transport specialist checks it.'}
          </p>
        </div>
        {dated && (
          <>
            <ul className="m-0 list-none p-0">
              {OUTCOMES.map((o) => (
                <li key={o.word} className="flex items-center gap-4 border-t border-line py-2.5">
                  <span className="w-[184px] shrink-0">
                    <Chip tone={o.tone}>{o.word}</Chip>
                  </span>
                  <span className="type-body-s text-ink-2">{o.text}</span>
                </li>
              ))}
            </ul>
            <p className="type-body-s m-0 text-ink-3">
              {`Checked against your planned travel dates, not today · job ${item.jobCode}`}
            </p>
          </>
        )}
      </div>
    </Panel>
  );
};
