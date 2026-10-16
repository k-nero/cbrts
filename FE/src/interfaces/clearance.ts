export type ChecklistStatus =
  | 'NOT_ISSUED'
  | 'AWAITING_UPLOAD'
  | 'IN_REVIEW'
  | 'CLEARED'
  | 'REJECTED'
  | 'WITH_AUTHORITY';

export type Validity = 'GREEN' | 'AMBER' | 'RED';
export type DocumentReview = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ChecklistHolder = 'CUSTOMER' | 'SPECIALIST' | 'AUTHORITY';
export type DocumentScope = 'PER_HORSE' | 'PER_SHIPMENT' | 'PER_CROSSING';
export type DocumentProvider = 'CUSTOMER' | 'AUTHORITY';
export type RegulationRuleKind =
  | 'WINDOW_BEFORE_DEPARTURE'
  | 'VALID_THROUGH_ARRIVAL_PLUS'
  | 'BOOSTER_WINDOW'
  | 'PRESENCE_ONLY';

export type DossierStatus =
  | 'OPEN'
  | 'SUBMITTED_TO_AUTHORITY'
  | 'ADDITIONAL_INFO_REQUIRED'
  | 'CLEARANCE_READY';

export type AuthorityKind = 'VETERINARY' | 'CUSTOMS' | 'QUARANTINE';
export type SubmissionKind = 'EXPORT_HEALTH_CERTS' | 'IMPORT_PERMIT' | 'CUSTOMS_DOSSIER';
export type SubmissionStatus =
  | 'READY_TO_FILE'
  | 'FILED'
  | 'ADDITIONAL_INFO'
  | 'ISSUED'
  | 'REFUSED';

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
  totalChecklistItems: number;
  mandatoryItems: number;
  clearedMandatoryItems: number;
  allQuarantinesCompleted: boolean;
  totalQuarantines: number;
  completedQuarantines: number;
  outstandingIssues: string[];
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
}

export interface RegulationVersion {
  id: string;
  catalogId: string;
  versionNo: number;
  status: 'DRAFT' | 'PUBLISHED' | 'RETIRED';
  publishedAt?: string;
  publishedByName?: string;
  leadTimeDays: number;
  quarantineMinDays: number;
  arrivalBufferDays: number;
  rules: RegulationRule[];
}

export interface RegulationCatalog {
  id: string;
  countryCode: string;
  name: string;
  activeVersion?: RegulationVersion;
}

export interface JobSummary {
  id: string;
  code: string;
  dossierStatus: DossierStatus;
  stage: string;
  clubName?: string;
}
