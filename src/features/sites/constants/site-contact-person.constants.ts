export const SITE_CONTACT_PERSON_TITLES = ["site_contact", "finance", "emergency"] as const;

export type SiteContactPersonTitle = (typeof SITE_CONTACT_PERSON_TITLES)[number];
