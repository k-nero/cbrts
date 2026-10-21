import type { FC } from 'react';
import { Chip, Panel } from '@/components/ui';
import { DocumentScopeEnum, type RegulationRule, RegulationRuleDiffEnum } from '@/interfaces';
import { RULE_SHAPE_LABELS, SCOPE_OPTIONS } from './constants';

type Props = {
  title: string;
  rules: RegulationRule[];
  selectedRuleId?: string;
  onEdit: (rule: RegulationRule) => void;
};

/** The catalog's document rules, with the draft's changed and new rules marked. */
const RulesTable: FC<Props> = ({ title, rules, selectedRuleId, onEdit }) => (
  <Panel
    title={title}
    extra={
      <span className="type-body-s text-ink-3">
        Each rule is evaluated against the job’s travel dates, never against today.
      </span>
    }
    flush
  >
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-line bg-sunken/40">
            <th className="type-label-s px-6 py-2.5 font-medium text-ink-3">Document</th>
            <th className="type-label-s w-[170px] px-4 py-2.5 font-medium text-ink-3">
              Rule shape
            </th>
            <th className="type-label-s w-[180px] px-4 py-2.5 font-medium text-ink-3">Parameter</th>
            <th className="type-label-s w-[120px] px-4 py-2.5 font-medium text-ink-3">
              Applies to
            </th>
            <th className="type-label-s w-[90px] px-4 py-2.5 font-medium text-ink-3">Blocks</th>
            <th className="type-label-s w-[60px] px-6 py-2.5 text-right font-medium text-ink-3"></th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => {
            const isSelected = rule.id === selectedRuleId;
            const isChanged = rule.diffStatus === RegulationRuleDiffEnum.CHANGED;
            const isNew = rule.diffStatus === RegulationRuleDiffEnum.NEW;
            const scope = rule.documentType?.scope;
            const scopeLabel =
              SCOPE_OPTIONS.find((option) => option.value === scope)?.label ?? 'Per horse';
            const blocksLabel =
              scope === DocumentScopeEnum.PER_CROSSING
                ? 'Per crossing'
                : rule.mandatory
                  ? 'Yes'
                  : 'Optional';

            return (
              <tr
                key={rule.id}
                className={`border-b border-line/70 transition-colors ${
                  isSelected
                    ? 'border-l-2 border-l-gold bg-sunken/80'
                    : isChanged || isNew
                      ? 'bg-amber-500/5 hover:bg-amber-500/10'
                      : 'hover:bg-sunken/30'
                }`}
              >
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <span className="type-label-s font-medium text-ink">
                      {rule.documentType?.name ?? 'Document'}
                    </span>
                    {(isChanged || isNew) && (
                      <Chip tone="warn" dot={false} className="px-1.5 py-0 text-[11px]">
                        {isNew ? 'New' : 'Changed'}
                      </Chip>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Chip tone="neutral" dot={false} className="text-[12px]">
                    {RULE_SHAPE_LABELS[rule.ruleKind] ?? rule.ruleKind}
                  </Chip>
                </td>
                <td className="px-4 py-3">
                  <span className="type-mono text-[13px] text-ink-2">
                    {rule.parameterDisplay ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="type-body-s text-ink-2">{scopeLabel}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="type-body-s text-ink-2">{blocksLabel}</span>
                </td>
                <td className="px-6 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onEdit(rule)}
                    className="type-label-s cursor-pointer font-medium text-ink-3 hover:text-ink"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </Panel>
);

export default RulesTable;
