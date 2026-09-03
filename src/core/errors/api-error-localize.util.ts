/**
 * Maps known English backend / DRF error strings to `ApiErrors.messages.*` keys
 * and applies locale-aware wording when Appearance language is Spanish (etc.).
 */

let localizer: ((message: string) => string) | null = null;

export function setApiErrorMessageLocalizer(next: ((message: string) => string) | null) {
  localizer = next;
}

/** Normalize for lookup: trim, collapse spaces, drop trailing punctuation, lowercase. */
export function normalizeApiErrorMessageForLookup(message: string): string {
  return message
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "")
    .toLowerCase();
}

/**
 * Exact English phrase (normalized) → `ApiErrors.messages.<key>`.
 * Keep keys stable; add Spanish (and other) copy in messages/*.json.
 */
export const API_ERROR_MESSAGE_KEYS: Record<string, string> = {
  "client with this email already exists": "clientEmailExists",
  "vendor with this email already exists": "vendorEmailExists",
  "contact with this email already exists": "contactEmailExists",
  "user with this email already exists": "userEmailExists",
  "a user with this email already exists": "userEmailExists",
  "email already exists": "emailAlreadyExists",
  "this email already exists": "emailAlreadyExists",
  "project type already exists in your organization": "projectTypeExistsInOrganization",
  "installation type already exists in your organization": "installationTypeExistsInOrganization",
  "vendor type already exists in your organization": "vendorTypeExistsInOrganization",
  "unit type already exists in your organization": "unitTypeExistsInOrganization",
  "rejection reason already exists in your organization": "rejectionReasonExistsInOrganization",
  "checklist type already exists in your organization": "checklistTypeExistsInOrganization",
  "project status already exists in your organization": "projectStatusExistsInOrganization",
  "pin status already exists in your organization": "pinStatusExistsInOrganization",
  "job status already exists in your organization": "jobStatusExistsInOrganization",
  "material status already exists in your organization": "materialStatusExistsInOrganization",
  "tag already exists in your organization": "tagExistsInOrganization",
  "title already exists in your organization": "titleExistsInOrganization",
  "this field is required": "fieldRequired",
  "this field may not be blank": "fieldRequired",
  "this field may not be null": "fieldRequired",
  "this field cannot be blank": "fieldRequired",
  "enter a valid email address": "invalidEmail",
  "enter a valid email": "invalidEmail",
  "invalid email": "invalidEmail",
  "enter a valid phone number": "invalidPhone",
  "invalid phone number": "invalidPhone",
  "a valid integer is required": "invalidInteger",
  "a valid number is required": "invalidNumber",
  "invalid credentials": "invalidCredentials",
  "unable to log in with provided credentials": "invalidCredentials",
  "authentication credentials were not provided": "authRequired",
  "authentication failed": "authRequired",
  "you do not have permission to perform this action": "permissionDenied",
  "permission denied": "permissionDenied",
  "not found": "notFound",
  "no client matches the given query": "notFound",
  "page not found": "notFound",
  "network error": "network",
  "request failed": "requestFailed",
  "validation failed": "validationFailed",
  "an error occurred": "fallback",
  "bad request": "badRequest",
  "error": "fallback",
};

/**
 * Known entity tokens for:
 * - "{Entity} with this {field} already exists"
 * - "{Entity} already exists in your organization"
 * Keys are lowercase English phrases from the API.
 */
export const API_ERROR_ENTITY_KEYS: Record<string, string> = {
  client: "client",
  vendor: "vendor",
  contact: "contact",
  user: "user",
  site: "site",
  project: "project",
  item: "item",
  job: "job",
  invoice: "invoice",
  quotation: "quotation",
  quote: "quotation",
  group: "group",
  "project type": "projectType",
  "installation type": "installationType",
  "vendor type": "vendorType",
  "unit type": "unitType",
  "rejection reason": "rejectionReason",
  "checklist type": "checklistType",
  "project status": "projectStatus",
  "pin status": "pinStatus",
  "job status": "jobStatus",
  "material status": "materialStatus",
  status: "status",
  tag: "tag",
  title: "title",
  role: "role",
  profile: "profile",
};

export const API_ERROR_FIELD_KEYS: Record<string, string> = {
  email: "email",
  phone: "phone",
  name: "name",
  username: "username",
  code: "code",
  sku: "sku",
  project_type: "name",
  installation_type: "name",
  status_name: "name",
  tag_name: "name",
  title: "name",
};

export function localizeApiErrorMessage(message: string): string {
  const trimmed = message?.trim();
  if (!trimmed) return message;
  if (!localizer) return trimmed;
  return localizer(trimmed);
}

export function localizeApiErrorMessages(messages: string[]): string[] {
  return messages.map((m) => localizeApiErrorMessage(m));
}
