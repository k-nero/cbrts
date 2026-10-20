import {
  type DocumentScope,
  DocumentScopeEnum,
  type RegulationRule,
  type RegulationRuleKind,
  RegulationRuleKindEnum,
} from '@/interfaces';

/** A row in the destinations list: one country's regulation catalog. */
export interface DestinationItem {
  id: string;
  code: string;
  label: string;
  version: string;
  hasDraft?: boolean;
}

/** "Per horse", "Per shipment" or "Per crossing". */
export const scopeLabel = (scope?: DocumentScope) =>
  SCOPE_OPTIONS.find((option) => option.value === scope)?.label ?? 'Per horse';

export const RULE_SHAPE_OPTIONS: { kind: RegulationRuleKind; label: string }[] = [
  { kind: RegulationRuleKindEnum.WINDOW_BEFORE_DEPARTURE, label: 'Window before departure' },
  { kind: RegulationRuleKindEnum.VALID_THROUGH_ARRIVAL_PLUS, label: 'Valid until' },
  { kind: RegulationRuleKindEnum.BOOSTER_WINDOW, label: 'Booster window' },
  { kind: RegulationRuleKindEnum.PRESENCE_ONLY, label: 'Presence only' },
];

/** The shorter labels the rules table uses. */
export const RULE_SHAPE_LABELS: Record<RegulationRuleKind, string> = {
  [RegulationRuleKindEnum.WINDOW_BEFORE_DEPARTURE]: 'Window before dep.',
  [RegulationRuleKindEnum.VALID_THROUGH_ARRIVAL_PLUS]: 'Valid until',
  [RegulationRuleKindEnum.BOOSTER_WINDOW]: 'Booster window',
  [RegulationRuleKindEnum.PRESENCE_ONLY]: 'Presence only',
};

export const SCOPE_OPTIONS: { label: string; value: DocumentScope }[] = [
  { label: 'Per horse', value: DocumentScopeEnum.PER_HORSE },
  { label: 'Per shipment', value: DocumentScopeEnum.PER_SHIPMENT },
  { label: 'Per crossing', value: DocumentScopeEnum.PER_CROSSING },
];

/** The rule the editor opens on: the EIA test when the catalog has one (as the Figma frame), else the first. */
export const defaultRule = (rules: RegulationRule[]) =>
  rules.find((rule) => rule.documentType?.code === 'EIA_TEST') ?? rules[0];

/** "3 changes", "1 change", or "no changes yet". */
export const changesLabel = (count?: number | null) =>
  !count ? 'no changes yet' : `${count} ${count === 1 ? 'change' : 'changes'}`;

/** "The 3 jobs pinned to v8 keep v8.", "The 1 job … keeps v8." or "No jobs are pinned to v8." */
export const pinnedJobsSentence = (count: number | null | undefined, versionNo: number) =>
  !count
    ? `No jobs are pinned to v${versionNo}.`
    : `The ${count} ${count === 1 ? 'job' : 'jobs'} pinned to v${versionNo} ${count === 1 ? 'keeps' : 'keep'} v${versionNo}.`;

/** "22 Sep 2026", or null when the version has no publish date. */
export const formatDay = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
