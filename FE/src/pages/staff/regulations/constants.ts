import type { RuleFormValues } from './schema';

import {
  type DocumentScope,
  DocumentScopeEnum,
  type RegulationRule,
  type RegulationRuleKind,
  RegulationRuleKindEnum,
  type UpdateRegulationRuleRequest,
} from '@/interfaces';

/** A row in the destinations list: one country, with its regulation catalog or none yet. */
export interface DestinationItem {
  id: string;
  code: string;
  label: string;
  /** "v7", "—" while the catalog has only its first draft, or null when the country has no catalog. */
  version: string | null;
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

/** The rule shapes as select options. */
export const RULE_SHAPE_SELECT = RULE_SHAPE_OPTIONS.map((option) => ({
  label: option.label,
  value: option.kind,
}));

/** What each shape checks, under the shape select. */
export const RULE_SHAPE_HELP: Record<RegulationRuleKind, string> = {
  [RegulationRuleKindEnum.WINDOW_BEFORE_DEPARTURE]:
    'Sampled or issued at most this many days before departure.',
  [RegulationRuleKindEnum.VALID_THROUGH_ARRIVAL_PLUS]:
    'Valid through the arrival day plus this many days.',
  [RegulationRuleKindEnum.BOOSTER_WINDOW]: 'Given between these days before departure.',
  [RegulationRuleKindEnum.PRESENCE_ONLY]: 'Only needs to be on file; no dates are checked.',
};

/** The parameters a new catalog starts from: 21-day cross-border and 3-day domestic lead time (BR-F1-01). */
export const DEFAULT_PARAMETERS = {
  leadTimeDays: 21,
  domesticLeadTimeDays: 3,
  quarantineMinDays: 7,
  arrivalBufferDays: 2,
};

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

/** "Hong Kong" from "Hong Kong import". */
export const catalogCountry = (name: string) => name.replace(/ import$/, '');

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

/** A rule's form values, or a new rule's: a window before departure that blocks. */
export const ruleFormValues = (rule?: RegulationRule): RuleFormValues => {
  const kind = rule?.ruleKind ?? RegulationRuleKindEnum.WINDOW_BEFORE_DEPARTURE;
  return {
    ruleKind: RULE_SHAPE_SELECT.find((o) => o.value === kind) ?? RULE_SHAPE_SELECT[0],
    minDays: rule?.minDays ?? null,
    maxDays: rule?.maxDays ?? null,
    mandatory: rule?.mandatory ?? true,
    description: rule?.description ?? '',
  };
};

/** The request for a rule's form values; the server drops the days its shape doesn't take. */
export const toRuleRequest = (v: RuleFormValues): UpdateRegulationRuleRequest => {
  const ruleKind = v.ruleKind.value as RegulationRuleKind;
  return {
    ruleKind,
    minDays: ruleKind === RegulationRuleKindEnum.BOOSTER_WINDOW ? v.minDays : null,
    maxDays: ruleKind === RegulationRuleKindEnum.PRESENCE_ONLY ? null : v.maxDays,
    mandatory: v.mandatory,
    description: v.description.trim() || null,
  };
};
