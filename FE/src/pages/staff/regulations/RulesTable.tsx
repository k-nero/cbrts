import type { FC } from 'react';
import { Flex, type TableColumnsType } from 'antd';

import { RULE_SHAPE_LABELS, scopeLabel } from './constants';

import Table from '@/components/table';
import { Button, Chip, Panel } from '@/components/ui';
import { DocumentScopeEnum, type RegulationRule, RegulationRuleDiffEnum } from '@/interfaces';
import { rowActionLabels } from '@/lib/utils';

type Props = {
  title: string;
  rules: RegulationRule[];
  selectedRuleId?: string;
  /** Rules can be added and removed only in a draft. */
  editable: boolean;
  onEdit: (rule: RegulationRule) => void;
  onAdd: () => void;
  onRemove: (rule: RegulationRule) => void;
};

/** "Yes", "Optional", or "Per crossing" for a crossing document. */
const blocksLabel = (rule: RegulationRule) =>
  rule.documentType?.scope === DocumentScopeEnum.PER_CROSSING
    ? 'Per crossing'
    : rule.mandatory
      ? 'Yes'
      : 'Optional';

/**
 * The version's document rules, with a draft's new and changed rules marked. A fixed-order table: no sort,
 * no filters, no pages (DESIGN.md, Tables).
 */
const RulesTable: FC<Props> = ({
  title,
  rules,
  selectedRuleId,
  editable,
  onEdit,
  onAdd,
  onRemove,
}) => {
  const columns: TableColumnsType<RegulationRule> = [
    {
      key: 'document',
      title: 'Document',
      width: 200,
      render: (_, rule) => (
        <Flex component="span" align="center" gap={8} wrap>
          <span className="type-label-s text-ink">{rule.documentType?.name ?? 'Document'}</span>
          {rule.diffStatus === RegulationRuleDiffEnum.NEW && (
            <Chip tone="warn" dot={false}>
              New
            </Chip>
          )}
          {rule.diffStatus === RegulationRuleDiffEnum.CHANGED && (
            <Chip tone="warn" dot={false}>
              Changed
            </Chip>
          )}
        </Flex>
      ),
    },
    {
      key: 'shape',
      title: 'Rule shape',
      width: 150,
      render: (_, rule) => (
        <Chip tone="neutral" dot={false}>
          {RULE_SHAPE_LABELS[rule.ruleKind] ?? rule.ruleKind}
        </Chip>
      ),
    },
    {
      key: 'parameter',
      title: 'Parameter',
      width: 160,
      render: (_, rule) => (
        <span className="type-data text-ink-2">{rule.parameterDisplay ?? '—'}</span>
      ),
    },
    {
      key: 'scope',
      title: 'Applies to',
      width: 100,
      render: (_, rule) => (
        <span className="type-body-s text-ink-2">{scopeLabel(rule.documentType?.scope)}</span>
      ),
    },
    {
      key: 'blocks',
      title: 'Blocks',
      width: 60,
      render: (_, rule) => <span className="type-body-s text-ink-2">{blocksLabel(rule)}</span>,
    },
    {
      key: 'actions',
      width: editable ? 130 : 70,
      align: 'right',
      render: (_, rule) => {
        const labels = rowActionLabels(rule.documentType?.name ?? 'rule');
        return (
          <Flex component="span" justify="end" gap={4}>
            <Button size="sm" variant="ghost" aria-label={labels.edit} onClick={() => onEdit(rule)}>
              {editable ? 'Edit' : 'View'}
            </Button>
            {editable && (
              <Button
                size="sm"
                variant="ghost"
                aria-label={labels.remove}
                onClick={() => onRemove(rule)}
              >
                Remove
              </Button>
            )}
          </Flex>
        );
      },
    },
  ];

  return (
    <Panel
      title={title}
      extra={
        editable && (
          <Button size="sm" variant="secondary" onClick={onAdd}>
            Add rule
          </Button>
        )
      }
      flush
    >
      <p className="type-body-s m-0 px-6 pb-3 text-ink-3">
        Each rule is evaluated against the job’s travel dates, never against today.
      </p>
      <Table<RegulationRule>
        id="regulation-rules"
        rowKey="id"
        columns={columns}
        dataSource={rules}
        pagination={false}
        showColumnSettings={false}
        ignoreKeys={['actions']}
        rowClassName={(rule) => (rule.id === selectedRuleId ? 'bg-sunken' : '')}
        locale={{
          emptyText: editable
            ? 'No document rules yet. Add the documents this country requires.'
            : 'This version has no document rules.',
        }}
      />
    </Panel>
  );
};

export default RulesTable;
