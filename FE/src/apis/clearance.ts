import client from '@/config/axios';
import type {
  Authority,
  AuthorityKind,
  AuthoritySubmission,
  ChecklistItem,
  ClearanceStatus,
  CreateAuthoritySubmissionRequest,
  CreateQuarantinePeriodRequest,
  DocumentType,
  DocumentUploadRequest,
  DocumentVersion,
  JobSummary,
  PagedResponse,
  QuarantinePeriod,
  RegulationCatalog,
  RegulationVersion,
  ReviewDocumentRequest,
  UpdateAuthoritySubmissionRequest,
  UpdateRegulationRuleRequest,
} from '@/interfaces';

export const clearanceApi = {
  // Jobs
  getActiveJobs: (q: string) =>
    client.get<PagedResponse<JobSummary>>('/staff/clearance/jobs', {
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

  checkLateSubmissions: () =>
    client.post<number>('/staff/clearance/submissions/check-late'),

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
  getRegulationCatalogs: () => client.get<RegulationCatalog[]>('/staff/regulations/catalogs'),

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
  getCustomerChecklist: (jobId: string) =>
    client.get<ChecklistItem[]>(`/customer/clearance/jobs/${jobId}/checklist`),

  uploadCustomerDocumentVersion: (checklistItemId: string, data: DocumentUploadRequest) =>
    client.post<ChecklistItem>(`/customer/clearance/checklist/${checklistItemId}/versions`, data),
};
