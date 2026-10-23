import { type FC } from 'react';

import { RuleForm } from './RuleForm';

import { Panel } from '@/components/ui';
import { type RegulationRule } from '@/interfaces';

type Props = {
  rule?: RegulationRule;
  /** Only a draft version's rules can change; a published version is immutable. */
  editable: boolean;
};

/**
 * Edits one rule of the draft catalog. Keyed by the rule's id, so picking another rule starts from its
 * saved values; Cancel goes back to them.
 */
const RuleEditor: FC<Props> = ({ rule, editable }) => {
  if (!rule)
    return (
      <Panel title="Edit rule" className="h-full">
        <p className="type-body-s m-0 text-ink-3">This version has no document rules yet.</p>
      </Panel>
    );
  return <RuleForm rule={rule} editable={editable} />;
};

export default RuleEditor;
