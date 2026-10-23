import { type FC, useState } from 'react';
import { App, Col, Flex, Input, Row } from 'antd';
import { Button, Callout, Checkbox, Panel } from '@/components/ui';
import { useUpdateRegulationRule } from '@/hooks/regulation';
import { type RegulationRule, type RegulationRuleKind, RegulationRuleKindEnum } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';
import { RULE_SHAPE_OPTIONS, scopeLabel } from './constants';

type Draft = { kind: RegulationRuleKind; days: string; mandatory: boolean };

const draftOf = (rule: RegulationRule): Draft => ({
  kind: rule.ruleKind,
  days:
    rule.maxDays !== undefined || rule.minDays !== undefined
      ? String(rule.maxDays ?? rule.minDays)
      : '',
  mandatory: rule.mandatory,
});

export const RuleForm: FC<{ rule: RegulationRule; editable: boolean }> = ({ rule, editable }) => {
  const { message } = App.useApp();
  const update = useUpdateRegulationRule();
  const [draft, setDraft] = useState<Draft>(() => draftOf(rule));
  const change = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const save = async () => {
    try {
      await update.mutateAsync({
        ruleId: rule.id,
        data: {
          ruleKind: draft.kind,
          maxDays: draft.days ? parseInt(draft.days, 10) : undefined,
          mandatory: draft.mandatory,
        },
      });
      message.success('Rule parameters updated in draft catalog');
    } catch (err: unknown) {
      message.error(apiErrorMessage(err, 'Failed to update rule'));
    }
  };

  return (
    <Panel
      title={`Edit rule · ${rule.documentType?.name ?? 'Document'}`}
      className="flex h-full flex-col gap-4"
    >
      <Flex vertical gap={16}>
        {!editable && (
          <Callout tone="info" title="This is the published version">
            Published rules don&apos;t change. Create a draft version to edit them.
          </Callout>
        )}

        <Flex vertical gap={8}>
          <span className="type-label-s font-medium text-ink-3">Rule shape</span>
          <Flex wrap gap={8}>
            {RULE_SHAPE_OPTIONS.map((option) => {
              const active = draft.kind === option.kind;
              return (
                <button
                  key={option.kind}
                  type="button"
                  disabled={!editable}
                  onClick={() => change({ kind: option.kind })}
                  className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors disabled:cursor-not-allowed ${
                    active
                      ? 'border-info-line bg-info-soft font-semibold text-info'
                      : 'border-line bg-card text-ink-2 enabled:hover:border-line-strong'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </Flex>
        </Flex>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Flex vertical gap={4}>
              <label className="type-label-s font-medium text-ink-3">
                {draft.kind === RegulationRuleKindEnum.WINDOW_BEFORE_DEPARTURE
                  ? 'Days before departure'
                  : draft.kind === RegulationRuleKindEnum.VALID_THROUGH_ARRIVAL_PLUS
                    ? 'Days after arrival'
                    : 'Days window'}
              </label>
              <Input
                value={draft.days}
                disabled={!editable || draft.kind === RegulationRuleKindEnum.PRESENCE_ONLY}
                onChange={(event) => change({ days: event.target.value })}
                placeholder="e.g. 45"
                className="rounded-md"
              />
              <span className="type-body-s text-ink-3">
                {rule.description || 'Evaluated against the departure or arrival date.'}
              </span>
            </Flex>
          </Col>

          <Col xs={24} md={12}>
            <Flex vertical gap={4}>
              <span className="type-label-s font-medium text-ink-3">Applies to</span>
              <span className="type-body-m text-ink">{scopeLabel(rule.documentType?.scope)}</span>
              <span className="type-body-s text-ink-3">
                Set by the document type, for every catalog.
              </span>
            </Flex>
          </Col>
        </Row>

        <div className="pt-1">
          <Checkbox
            label="Blocks departure when not GREEN"
            checked={draft.mandatory}
            disabled={!editable}
            onChange={(event) => change({ mandatory: event.target.checked })}
          />
        </div>

        {editable && (
          <div className="pt-2">
            <Flex align="center" justify="end" gap={12}>
              <Button variant="ghost" onClick={() => setDraft(draftOf(rule))}>
                Cancel
              </Button>
              <Button variant="secondary" onClick={save} disabled={update.isPending}>
                Save to draft
              </Button>
            </Flex>
          </div>
        )}
      </Flex>
    </Panel>
  );
};
