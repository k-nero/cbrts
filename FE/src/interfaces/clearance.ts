/** The enums below mirror the backend's (entity/enums/*.java); compare against XEnum.VALUE, not a string. */
export const ChecklistStatusEnum = {
  NOT_ISSUED: 'NOT_ISSUED',
  AWAITING_UPLOAD: 'AWAITING_UPLOAD',
  IN_REVIEW: 'IN_REVIEW',
  CLEARED: 'CLEARED',
  REJECTED: 'REJECTED',
  WITH_AUTHORITY: 'WITH_AUTHORITY',
} as const;
export type ChecklistStatus = (typeof ChecklistStatusEnum)[keyof typeof ChecklistStatusEnum];

export const ValidityEnum = {
  GREEN: 'GREEN',
  AMBER: 'AMBER',
  RED: 'RED',
} as const;
export type Validity = (typeof ValidityEnum)[keyof typeof ValidityEnum];

export const DocumentReviewEnum = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type DocumentReview = (typeof DocumentReviewEnum)[keyof typeof DocumentReviewEnum];

export const ChecklistHolderEnum = {
  CUSTOMER: 'CUSTOMER',
  SPECIALIST: 'SPECIALIST',
  AUTHORITY: 'AUTHORITY',
} as const;
export type ChecklistHolder = (typeof ChecklistHolderEnum)[keyof typeof ChecklistHolderEnum];

export const DocumentScopeEnum = {
  PER_HORSE: 'PER_HORSE',
  PER_SHIPMENT: 'PER_SHIPMENT',
  PER_CROSSING: 'PER_CROSSING',
} as const;
export type DocumentScope = (typeof DocumentScopeEnum)[keyof typeof DocumentScopeEnum];

export const DocumentProviderEnum = {
  CUSTOMER: 'CUSTOMER',
  AUTHORITY: 'AUTHORITY',
} as const;
export type DocumentProvider = (typeof DocumentProviderEnum)[keyof typeof DocumentProviderEnum];

export const RegulationRuleKindEnum = {
  WINDOW_BEFORE_DEPARTURE: 'WINDOW_BEFORE_DEPARTURE',
  VALID_THROUGH_ARRIVAL_PLUS: 'VALID_THROUGH_ARRIVAL_PLUS',
  BOOSTER_WINDOW: 'BOOSTER_WINDOW',
  PRESENCE_ONLY: 'PRESENCE_ONLY',
} as const;
export type RegulationRuleKind =
  (typeof RegulationRuleKindEnum)[keyof typeof RegulationRuleKindEnum];

/** How a draft rule differs from the published version (regulations page). */
export const RegulationRuleDiffEnum = {
  UNCHANGED: 'UNCHANGED',
  CHANGED: 'CHANGED',
  NEW: 'NEW',
} as const;
export type RegulationRuleDiff =
  (typeof RegulationRuleDiffEnum)[keyof typeof RegulationRuleDiffEnum];

export const CatalogStatusEnum = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  RETIRED: 'RETIRED',
} as const;
export type CatalogStatus = (typeof CatalogStatusEnum)[keyof typeof CatalogStatusEnum];

export const DossierStatusEnum = {
  OPEN: 'OPEN',
  SUBMITTED_TO_AUTHORITY: 'SUBMITTED_TO_AUTHORITY',
  ADDITIONAL_INFO_REQUIRED: 'ADDITIONAL_INFO_REQUIRED',
  CLEARANCE_READY: 'CLEARANCE_READY',
} as const;
export type DossierStatus = (typeof DossierStatusEnum)[keyof typeof DossierStatusEnum];

export const AuthorityKindEnum = {
  VETERINARY: 'VETERINARY',
  CUSTOMS: 'CUSTOMS',
  QUARANTINE: 'QUARANTINE',
} as const;
export type AuthorityKind = (typeof AuthorityKindEnum)[keyof typeof AuthorityKindEnum];

export const SubmissionKindEnum = {
  EXPORT_HEALTH_CERTS: 'EXPORT_HEALTH_CERTS',
  IMPORT_PERMIT: 'IMPORT_PERMIT',
  CUSTOMS_DOSSIER: 'CUSTOMS_DOSSIER',
} as const;
export type SubmissionKind = (typeof SubmissionKindEnum)[keyof typeof SubmissionKindEnum];

export const SubmissionStatusEnum = {
  READY_TO_FILE: 'READY_TO_FILE',
  FILED: 'FILED',
  ADDITIONAL_INFO: 'ADDITIONAL_INFO',
  ISSUED: 'ISSUED',
  REFUSED: 'REFUSED',
} as const;
export type SubmissionStatus = (typeof SubmissionStatusEnum)[keyof typeof SubmissionStatusEnum];

export interface DocumentVersion {
  id: string;
  checklistItemId: string;
  versionNo: number;
  fileId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  issuedOn?: string;
  sampledOn?: string;
  validUntil?: string;
  issuer?: string;
  uploadedById?: string;
  uploadedByName?: string;
  uploadedAt: string;
  review: DocumentReview;
  reviewedById?: string;
  reviewedByName?: string;
  /** "Lan" in "Cleared by Lan". */
  reviewedByCalledName?: string;
  reviewedAt?: string;
  rejectReason?: string;
}

export interface ChecklistItem {
  id: string;
  jobId: string;
  jobCode: string;
  documentTypeId: string;
  documentTypeCode: string;
  documentTypeName: string;
  documentScope: DocumentScope;
  providedBy: DocumentProvider;
  regulationRuleId?: string;
  ruleKind?: RegulationRuleKind;
  mandatory: boolean;
  minDays?: number;
  maxDays?: number;
  ruleDescription?: string;
  /** The catalog the rule comes from: "Hong Kong v2", the origin's or the destination's pinned version. */
  ruleCatalog?: string | null;
  /** The job moved onto a catalog version that no longer lists this document; it no longer counts. */
  droppedAt?: string | null;
  /** The item came from a catalog version the job moved onto after its checklist was made. */
  addedByUpdate?: boolean;
  horseId?: string;
  horseName?: string;
  horseMicrochip?: string;
  borderCrossingId?: string;
  borderCrossingName?: string;
  status: ChecklistStatus;
  validity?: Validity;
  validityNote?: string;
  evaluatedAt?: string;
  holder?: ChecklistHolder;
  dueDate?: string;
  currentVersion?: DocumentVersion;
  createdAt: string;
  updatedAt?: string;
}

export interface ClearanceStatus {
  jobId: string;
  jobCode: string;
  dossierStatus: DossierStatus;
  clearanceReady: boolean;
  clearanceReadyAt?: string;
  departedAt?: string | null;
  isDeparted?: boolean;
  totalChecklistItems: number;
  mandatoryItems: number;
  clearedMandatoryItems: number;
  allQuarantinesCompleted: boolean;
  totalQuarantines: number;
  completedQuarantines: number;
  outstandingIssues: string[];
  /** The pinned destination catalog ("Cambodia import"); absent until the job is approved. */
  destination?: string;
  /** That catalog's minimum pre-export quarantine, in days. */
  quarantineMinDays?: number;
}

export interface DocumentReviewDetail {
  version: DocumentVersion;
  item: ChecklistItem;
  jobId?: string;
  jobCode?: string;
  requestCode?: string;
  clubName?: string;
  departureDate?: string;
  totalChecklistItems: number;
  mandatoryItems: number;
  clearedMandatoryItems: number;
  remainingMandatoryItems: number;
  allVersions: DocumentVersion[];
  automaticCheckText: string;
  automaticCheckTone: 'ok' | 'info' | 'warn' | 'bad';
  /** 1-based; 0 once this version is no longer waiting for review. */
  queuePosition: number;
  queueTotal: number;
  nextVersionId?: string;
  nextDocumentName?: string;
}

export interface ReviewDocumentRequest {
  review: DocumentReview;
  rejectReason?: string;
}

export interface DocumentUploadRequest {
  fileId: string;
  issuedOn?: string;
  sampledOn?: string;
  validUntil?: string;
  issuer?: string;
}

/** US-F2-03: the dates checked before the file is uploaded. */
export interface DocumentCheckRequest {
  issuedOn: string;
  sampledOn?: string;
  validUntil: string;
}

/**
 * RED is refused and its file never uploaded; AMBER is kept but won't clear; GREEN goes to review. The rule, the
 * value found and the value that passes are absent when no date rule applies (US-F2-09).
 */
export interface DocumentCheckResponse {
  validity: Validity;
  note: string;
  rule?: string | null;
  found?: string | null;
  required?: string | null;
  /** AMBER only: the date a replacement is needed by. */
  renewBy?: string | null;
}

export interface Authority {
  id: string;
  name: string;
  countryCode: string;
  kind: AuthorityKind;
  slaDays?: number;
}

export interface AuthoritySubmission {
  id: string;
  jobId: string;
  jobCode: string;
  authority: Authority;
  kind: SubmissionKind;
  status: SubmissionStatus;
  filedAt?: string;
  filedByName?: string;
  referenceNo?: string;
  expectedBy?: string;
  isOverdue: boolean;
  issuedAt?: string;
  resultFileId?: string;
  resultFileName?: string;
  checklistItemIds: string[];
}

export interface CreateAuthoritySubmissionRequest {
  authorityId: string;
  kind: SubmissionKind;
  referenceNo?: string;
  expectedBy?: string;
  checklistItemIds?: string[];
}

export interface UpdateAuthoritySubmissionRequest {
  status: SubmissionStatus;
  referenceNo?: string;
  expectedBy?: string;
  resultFileId?: string;
}

export interface QuarantinePeriod {
  id: string;
  jobId: string;
  horseId?: string;
  horseName?: string;
  placeId: string;
  placeName?: string;
  startsOn: string;
  endsOn: string;
  completedAt?: string;
  isCompleted: boolean;
}

export interface CreateQuarantinePeriodRequest {
  horseId?: string;
  placeId: string;
  startsOn: string;
  endsOn: string;
}

export interface DocumentType {
  id: string;
  code: string;
  name: string;
  scope: DocumentScope;
  providedBy: DocumentProvider;
}

export interface RegulationRule {
  id: string;
  documentType: DocumentType;
  mandatory: boolean;
  ruleKind: RegulationRuleKind;
  minDays?: number;
  maxDays?: number;
  description?: string;
  diffStatus?: RegulationRuleDiff;
  parameterDisplay?: string;
}

export interface RegulationVersion {
  id: string;
  catalogId: string;
  versionNo: number;
  status: CatalogStatus;
  publishedAt?: string;
  publishedByName?: string;
  leadTimeDays: number;
  domesticLeadTimeDays: number;
  quarantineMinDays: number;
  arrivalBufferDays: number;
  rules: RegulationRule[];
  pinnedJobsCount: number;
  /** The draft's new, changed and removed rules and changed parameters, against the published version. */
  changesCount: number;
}

export interface RegulationCatalog {
  id: string;
  countryCode: string;
  name: string;
  activeVersion?: RegulationVersion;
  draftVersion?: RegulationVersion;
  versions?: RegulationVersion[];
}

/** A country we serve, with its regulation catalog or null when it has none yet (US-F2-12). */
export interface RegulationCountry {
  id: string;
  code: string;
  name: string;
  catalog: RegulationCatalog | null;
}

export interface CountryRequest {
  code: string;
  name: string;
}

/** A draft version's parameters in days; a new catalog's first draft starts from them. */
export interface RegulationParametersRequest {
  leadTimeDays: number;
  domesticLeadTimeDays: number;
  quarantineMinDays: number;
  arrivalBufferDays: number;
}

export interface UpdateRegulationRuleRequest {
  ruleKind: RegulationRuleKind;
  minDays: number | null;
  maxDays: number | null;
  mandatory: boolean;
  description: string | null;
}

export interface AddRegulationRuleRequest extends UpdateRegulationRuleRequest {
  documentTypeId: string;
}

export interface ClearanceJobSummary {
  id: string;
  code: string;
  dossierStatus: DossierStatus;
  stage: string;
  clubName?: string;
  originCity?: string;
  destinationCity?: string;
}

/** A newer published version of a catalog the job is pinned to, and what moving onto it changes. */
export interface CatalogUpdate {
  role: 'ORIGIN' | 'DESTINATION';
  country: string;
  pinnedVersionId: string;
  pinnedVersionNo: number;
  versionId: string;
  versionNo: number;
  publishedAt?: string | null;
  added: string[];
  /** "EIA (Coggins): within 60 d, mandatory → within 45 d, mandatory". */
  changed: string[];
  removed: string[];
}

export interface CatalogMoveRequest {
  versionId: string;
  reason: string;
}
