import client from '@/config/axios';
import type {
  AddRegulationRuleRequest,
  Authority,
  AuthorityKind,
  AuthoritySubmission,
  ChecklistItem,
  ClearanceStatus,
  CreateAuthoritySubmissionRequest,
  CountryRequest,
  CreateQuarantinePeriodRequest,
  DocumentType,
  DocumentUploadRequest,
  DocumentVersion,
  DocumentReviewDetail,
  DocumentCheckRequest,
  DocumentCheckResponse,
  ClearanceJobSummary,
  PagedResponse,
  QuarantinePeriod,
  RegulationCountry,
  RegulationParametersRequest,
  RegulationVersion,
  ReviewDocumentRequest,
  UpdateAuthoritySubmissionRequest,
  UpdateRegulationRuleRequest,
} from '@/interfaces';

export const clearanceApi = {
  // Jobs
  getActiveJobs: (q: string) =>
    client.get<PagedResponse<ClearanceJobSummary>>('/staff/clearance/jobs', {
      params: { q: q || undefined, size: 20 },
    }),

  // Checklist & Clearance Gate
  getChecklist: (jobId: string) =>
    client.get<ChecklistItem[]>(`/staff/clearance/jobs/${jobId}/checklist`),

  generateChecklist: (jobId: string) =>
    client.post<ChecklistItem[]>(`/staff/clearance/jobs/${jobId}/generate-checklist`),

  getClearanceStatus: (jobId: string) =>
    client.get<ClearanceStatus>(`/staff/clearance/jobs/${jobId}/status`),

  evaluateClearanceGate: (jobId: string) =>
    client.post<ClearanceStatus>(`/staff/clearance/jobs/${jobId}/evaluate-gate`),

  // Document Versions & Specialist Review
  getPendingReviews: () => client.get<DocumentVersion[]>('/staff/clearance/pending-reviews'),

  uploadDocumentVersion: (checklistItemId: string, data: DocumentUploadRequest) =>
    client.post<ChecklistItem>(`/staff/clearance/checklist/${checklistItemId}/versions`, data),

  getDocumentReviewDetail: (documentVersionId: string) =>
    client.get<DocumentReviewDetail>(`/staff/clearance/versions/${documentVersionId}`),

  reviewDocument: (documentVersionId: string, data: ReviewDocumentRequest) =>
    client.post<DocumentVersion>(`/staff/clearance/versions/${documentVersionId}/review`, data),

  // Authorities & Submissions
  getAuthorities: (params?: { countryCode?: string; kind?: AuthorityKind }) =>
    client.get<Authority[]>('/staff/clearance/authorities', { params }),

  getSubmissionsByJob: (jobId: string) =>
    client.get<AuthoritySubmission[]>(`/staff/clearance/jobs/${jobId}/submissions`),

  createSubmission: (jobId: string, data: CreateAuthoritySubmissionRequest) =>
    client.post<AuthoritySubmission>(`/staff/clearance/jobs/${jobId}/submissions`, data),

  updateSubmission: (submissionId: string, data: UpdateAuthoritySubmissionRequest) =>
    client.put<AuthoritySubmission>(`/staff/clearance/submissions/${submissionId}`, data),

  getQuarantineFacilities: () =>
    client.get<Array<{ id: string; name: string; city?: string; countryCode?: string }>>(
      '/staff/clearance/quarantine-facilities',
    ),

  // Quarantines
  getQuarantinesByJob: (jobId: string) =>
    client.get<QuarantinePeriod[]>(`/staff/clearance/jobs/${jobId}/quarantines`),

  createQuarantine: (jobId: string, data: CreateQuarantinePeriodRequest) =>
    client.post<QuarantinePeriod>(`/staff/clearance/jobs/${jobId}/quarantines`, data),

  completeQuarantine: (quarantineId: string) =>
    client.post<QuarantinePeriod>(`/staff/clearance/quarantines/${quarantineId}/complete`),

  // Regulations
  getRegulationCountries: () => client.get<RegulationCountry[]>('/staff/regulations/countries'),

  addCountry: (data: CountryRequest) =>
    client.post<RegulationCountry>('/staff/regulations/countries', data),

  createRegulationCatalog: (countryId: string, data: RegulationParametersRequest) =>
    client.post<RegulationVersion>(`/staff/regulations/countries/${countryId}/catalog`, data),

  updateRegulationParameters: (versionId: string, data: RegulationParametersRequest) =>
    client.put<RegulationVersion>(`/staff/regulations/versions/${versionId}`, data),

  addRegulationRule: (versionId: string, data: AddRegulationRuleRequest) =>
    client.post<RegulationVersion>(`/staff/regulations/versions/${versionId}/rules`, data),

  removeRegulationRule: (ruleId: string) =>
    client.delete<RegulationVersion>(`/staff/regulations/rules/${ruleId}`),

  getRegulationVersionDetails: (versionId: string) =>
    client.get<RegulationVersion>(`/staff/regulations/versions/${versionId}`),

  getDocumentTypes: () => client.get<DocumentType[]>('/staff/regulations/document-types'),

  publishRegulationVersion: (versionId: string) =>
    client.post<RegulationVersion>(`/staff/regulations/versions/${versionId}/publish`),

  updateRegulationRule: (ruleId: string, data: UpdateRegulationRuleRequest) =>
    client.put<RegulationVersion>(`/staff/regulations/rules/${ruleId}`, data),

  discardRegulationDraft: (versionId: string) =>
    client.delete(`/staff/regulations/versions/${versionId}`),

  createRegulationDraft: (catalogId: string) =>
    client.post<RegulationVersion>(`/staff/regulations/catalogs/${catalogId}/draft`),

  // Customer Clearance Endpoints (US-F2-03)
  /** US-F2-02: the documents behind a request; empty until it is approved into a job. */
  getCustomerRequestChecklist: (requestId: string) =>
    client.get<ChecklistItem[]>(`/customer/clearance/requests/${requestId}/checklist`),
  getCustomerChecklist: (jobId: string) =>
    client.get<ChecklistItem[]>(`/customer/clearance/jobs/${jobId}/checklist`),

  /** US-F2-03: the automatic check on the dates, before the file is uploaded. Saves nothing. */
  checkCustomerDocument: (checklistItemId: string, data: DocumentCheckRequest) =>
    client.post<DocumentCheckResponse>(
      `/customer/clearance/checklist/${checklistItemId}/check`,
      data,
    ),

  getCustomerVersions: (checklistItemId: string) =>
    client.get<DocumentVersion[]>(`/customer/clearance/checklist/${checklistItemId}/versions`),

  uploadCustomerDocumentVersion: (checklistItemId: string, data: DocumentUploadRequest) =>
    client.post<ChecklistItem>(`/customer/clearance/checklist/${checklistItemId}/versions`, data),
};
