import {
  type DocumentScope,
  DocumentScopeEnum,
  type RegulationRule,
  type RegulationRuleKind,
  RegulationRuleKindEnum,
} from '@/interfaces';

/** A row in the destinations list: a country's catalog or a border crossing's. */
export interface DestinationItem {
  id: string;
  code: string;
  label: string;
  version: string;
  isCountry: boolean;
  countryCode?: string;
  hasDraft?: boolean;
}

/**
 * FIXME(mock): the crossings and their versions are Figma placeholders, not loaded from the API.
 * Selecting one finds no catalog.
 */
export const BORDER_CROSSINGS: DestinationItem[] = [
  { id: 'bc-1', code: 'BRD', label: 'Mộc Bài – Bavet', version: 'v2', isCountry: false },
  { id: 'bc-2', code: 'BRD', label: 'Poipet – Aranyaprathet', version: 'v3', isCountry: false },
  { id: 'bc-3', code: 'BRD', label: 'Cầu Treo – Nam Phao', version: 'v1', isCountry: false },
  { id: 'bc-4', code: 'BRD', label: 'Sadao – Bukit Kayu Hitam', version: 'v2', isCountry: false },
];

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
