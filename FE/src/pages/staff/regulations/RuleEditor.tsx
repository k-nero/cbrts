import { type FC, useState } from 'react';
import { App, Input, Select } from 'antd';
import { Button, Callout, Checkbox, Panel } from '@/components/ui';
import { useUpdateRegulationRule } from '@/hooks/regulation';
import {
  type DocumentScope,
  DocumentScopeEnum,
  type RegulationRule,
  type RegulationRuleKind,
  RegulationRuleKindEnum,
} from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';
import { RULE_SHAPE_OPTIONS, SCOPE_OPTIONS } from './constants';

type Draft = {
  kind: RegulationRuleKind;
  days: string;
  appliesTo: DocumentScope;
  mandatory: boolean;
  description: string;
};

const draftOf = (rule?: RegulationRule): Draft => ({
  kind: rule?.ruleKind ?? RegulationRuleKindEnum.WINDOW_BEFORE_DEPARTURE,
  days: String(rule?.maxDays ?? rule?.minDays ?? 45),
  appliesTo: rule?.documentType?.scope ?? DocumentScopeEnum.PER_HORSE,
  mandatory: rule?.mandatory ?? true,
  description: rule?.description ?? '',
});

/**
 * Edits one rule of the draft catalog. Keyed by the rule's id, so picking another rule starts from its
 * saved values; Cancel goes back to them.
 */
const RuleEditor: FC<{ rule?: RegulationRule }> = ({ rule }) => {
  const { message } = App.useApp();
  const update = useUpdateRegulationRule();
  const [draft, setDraft] = useState<Draft>(() => draftOf(rule));
  const change = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const save = async () => {
    if (!rule) return;
    try {
      await update.mutateAsync({
        ruleId: rule.id,
        data: {
          ruleKind: draft.kind,
          maxDays: draft.days ? parseInt(draft.days, 10) : undefined,
          mandatory: draft.mandatory,
          description: draft.description,
        },
      });
      message.success('Rule parameters updated in draft catalog');
    } catch (err: unknown) {
      message.error(apiErrorMessage(err, 'Failed to update rule'));
    }
  };

  return (
    <Panel
      title={`Edit rule · ${rule?.documentType?.name ?? 'EIA (Coggins) test'}`}
      className="flex flex-col gap-4 lg:col-span-2"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="type-label-s font-medium text-ink-3">Rule shape</span>
          <div className="flex flex-wrap gap-2">
            {RULE_SHAPE_OPTIONS.map((option) => {
              const active = draft.kind === option.kind;
              return (
                <button
                  key={option.kind}
                  type="button"
                  onClick={() => change({ kind: option.kind })}
                  className={`cursor-pointer rounded-full border px-3 py-1 font-mono text-xs transition-colors ${
                    active
                      ? 'border-blue-500 bg-blue-600/20 font-semibold text-blue-300'
                      : 'border-line bg-card text-ink-2 hover:border-line-strong'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="type-label-s font-medium text-ink-3">
              {draft.kind === RegulationRuleKindEnum.WINDOW_BEFORE_DEPARTURE
                ? 'Days before departure'
                : draft.kind === RegulationRuleKindEnum.VALID_THROUGH_ARRIVAL_PLUS
                  ? 'Days after arrival'
                  : 'Days window'}
            </label>
            <Input
              value={draft.days}
              onChange={(event) => change({ days: event.target.value })}
              placeholder="e.g. 45"
              className="rounded-md"
            />
            <span className="type-body-s text-[12px] text-ink-3">
              {/* FIXME(mock): the EIA hint is Figma copy, not the rule's real history. */}
              {rule?.documentType?.code === 'EIA_TEST'
                ? 'Was 60 in v7. Source: GDAHP notice 14/2026.'
                : 'Evaluated against departure or arrival date.'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="type-label-s font-medium text-ink-3">Applies to</label>
            <Select
              value={draft.appliesTo}
              onChange={(appliesTo) => change({ appliesTo })}
              options={SCOPE_OPTIONS}
              className="w-full"
            />
          </div>
        </div>

        <div className="pt-1">
          <Checkbox
            label="Blocks departure when not GREEN"
            checked={draft.mandatory}
            onChange={(event) => change({ mandatory: event.target.checked })}
          />
        </div>

        {/* FIXME(mock): the impact is Figma copy; nothing computes which open jobs a change affects. */}
        <Callout tone="warn" title="Re-check impact: 2 open jobs">
          CBRT-2026-041 and CBRT-2026-044 have Coggins tests older than 45 days at departure. After
          publishing they are flagged for review; approved documents are not revoked automatically.
        </Callout>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={() => rule && setDraft(draftOf(rule))}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={save} disabled={update.isPending}>
            Save to draft
          </Button>
        </div>
      </div>
    </Panel>
  );
};

export default RuleEditor;
