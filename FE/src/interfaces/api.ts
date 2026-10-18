/**
 * Shared API envelope types. Mirrors `model/common/*` and the
 * Spring Data `Page` shape used by every paged controller.
 */

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // current page index, 0-based
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

export interface ApiError {
  status: number;
  /** The backend's error token: "Validation Failed", "Bad Request" or a code such as HORSE_NAME_TAKEN. */
  error?: string;
  code?: string;
  message: string;
  /** "field: message" lines of a 400 "Validation Failed", or every blocker of a 409 SUBMISSION_BLOCKED. */
  details?: string[] | null;
  path?: string;
  timestamp?: string;
  /** Field-level validation errors keyed by field name */
  errors?: Record<string, string>;
}

/** Backend `BaseEntity` fields present on every resource. */
export interface BaseEntity {
  id: string; // UUID
  createdAt: string;
  updatedAt: string;
}
