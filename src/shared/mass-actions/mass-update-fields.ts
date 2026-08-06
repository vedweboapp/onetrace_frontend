import { Country } from "country-state-city";
import type { CheckmarkSelectOption } from "@/shared/ui";
import type { MassUpdateFieldDef } from "./types";
import { FIELD_MAX_LENGTH } from "@/shared/form/field-max-length.util";

export function activeInactiveSelectOptions(activeLabel: string, inactiveLabel: string): CheckmarkSelectOption[] {
  return [
    { value: "true", label: activeLabel },
    { value: "false", label: inactiveLabel },
  ];
}

export function countryNameSelectOptions(): CheckmarkSelectOption[] {
  return Country.getAllCountries()
    .map((c) => ({ value: c.name, label: c.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function textField(name: string, label: string, maxLength?: number): MassUpdateFieldDef {
  return { name, label, valueType: "text", maxLength: maxLength ?? FIELD_MAX_LENGTH.GENERIC_TEXT };
}

function nameField(name: string, label: string): MassUpdateFieldDef {
  return { name, label, valueType: "name", maxLength: FIELD_MAX_LENGTH.NAME };
}

function titleField(name: string, label: string): MassUpdateFieldDef {
  return { name, label, valueType: "title", maxLength: FIELD_MAX_LENGTH.TITLE };
}

function emailField(name: string, label: string): MassUpdateFieldDef {
  return { name, label, valueType: "email", maxLength: FIELD_MAX_LENGTH.EMAIL };
}

function textareaField(name: string, label: string, maxLength?: number): MassUpdateFieldDef {
  return { name, label, valueType: "textarea", maxLength: maxLength ?? FIELD_MAX_LENGTH.DESCRIPTION };
}

function numberField(name: string, label: string): MassUpdateFieldDef {
  return { name, label, valueType: "number" };
}

function phoneField(name: string, label: string): MassUpdateFieldDef {
  return { name, label, valueType: "phone", maxLength: FIELD_MAX_LENGTH.PHONE_DIGITS };
}

function digitsField(name: string, label: string, maxLength?: number): MassUpdateFieldDef {
  return { name, label, valueType: "digits", maxLength: maxLength ?? FIELD_MAX_LENGTH.PINCODE };
}

function selectField(
  name: string,
  label: string,
  options: CheckmarkSelectOption[],
  valueCoerce?: MassUpdateFieldDef["valueCoerce"],
): MassUpdateFieldDef {
  return { name, label, valueType: "select", options, valueCoerce };
}

function addressFields(labels: {
  addressLine1: string;
  addressLine2: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
}): MassUpdateFieldDef[] {
  return [
    textField("address_line_1", labels.addressLine1, FIELD_MAX_LENGTH.ADDRESS_LINE),
    textField("address_line_2", labels.addressLine2, FIELD_MAX_LENGTH.ADDRESS_LINE),
    selectField("country", labels.country, countryNameSelectOptions()),
    textField("state", labels.state, FIELD_MAX_LENGTH.CITY),
    textField("city", labels.city, FIELD_MAX_LENGTH.CITY),
    digitsField("pincode", labels.pincode),
  ];
}

export type JobMassUpdateLabels = {
  title: string;
  description: string;
  client: string;
  project: string;
  site: string;
  forms: string;
  jobStatus: string;
  startDate: string;
};

export function buildJobMassUpdateFields(
  options: {
    jobStatusOptions: CheckmarkSelectOption[];
    clientOptions: CheckmarkSelectOption[];
    projectOptions: CheckmarkSelectOption[];
    siteOptions: CheckmarkSelectOption[];
    formOptions: CheckmarkSelectOption[];
  },
  labels: JobMassUpdateLabels,
  opts?: { includeForms?: boolean },
): MassUpdateFieldDef[] {
  const fields: MassUpdateFieldDef[] = [
    titleField("title", labels.title),
    textareaField("description", labels.description),
    selectField("client", labels.client, options.clientOptions, "number"),
    selectField("project", labels.project, options.projectOptions, "number"),
    selectField("site", labels.site, options.siteOptions, "number"),
  ];
  if (opts?.includeForms) {
    fields.push(selectField("forms", labels.forms, options.formOptions, "number"));
  }
  fields.push(
    selectField("job_status", labels.jobStatus, options.jobStatusOptions, "number"),
    {
      name: "start_date",
      label: labels.startDate,
      valueType: "datetime",
      valueFormat: "datetime-iso",
    },
  );
  return fields;
}

export type ClientMassUpdateLabels = {
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  isActive: string;
  activeLabel: string;
  inactiveLabel: string;
};

export function buildClientMassUpdateFields(labels: ClientMassUpdateLabels): MassUpdateFieldDef[] {
  return [
    nameField("name", labels.name),
    emailField("email", labels.email),
    phoneField("phone", labels.phone),
    ...addressFields({
      addressLine1: labels.addressLine1,
      addressLine2: labels.addressLine2,
      country: labels.country,
      state: labels.state,
      city: labels.city,
      pincode: labels.pincode,
    }),
    selectField("is_active", labels.isActive, activeInactiveSelectOptions(labels.activeLabel, labels.inactiveLabel), "boolean"),
  ];
}

export type VendorMassUpdateLabels = {
  name: string;
  email: string;
  phone: string;
  type: string;
  addressLine1: string;
  addressLine2: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  isActive: string;
  activeLabel: string;
  inactiveLabel: string;
};

export function buildVendorMassUpdateFields(
  typeOptions: CheckmarkSelectOption[],
  labels: VendorMassUpdateLabels,
): MassUpdateFieldDef[] {
  return [
    nameField("name", labels.name),
    emailField("email", labels.email),
    phoneField("phone", labels.phone),
    selectField("type", labels.type, typeOptions, "number"),
    ...addressFields({
      addressLine1: labels.addressLine1,
      addressLine2: labels.addressLine2,
      country: labels.country,
      state: labels.state,
      city: labels.city,
      pincode: labels.pincode,
    }),
    selectField("is_active", labels.isActive, activeInactiveSelectOptions(labels.activeLabel, labels.inactiveLabel), "boolean"),
  ];
}

export type ContactMassUpdateLabels = {
  name: string;
  email: string;
  phone: string;
  client: string;
  addressLine1: string;
  addressLine2: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  isActive: string;
  activeLabel: string;
  inactiveLabel: string;
};

export function buildContactMassUpdateFields(
  clientOptions: CheckmarkSelectOption[],
  labels: ContactMassUpdateLabels,
): MassUpdateFieldDef[] {
  return [
    nameField("name", labels.name),
    emailField("email", labels.email),
    phoneField("phone", labels.phone),
    selectField("client", labels.client, clientOptions, "number"),
    ...addressFields({
      addressLine1: labels.addressLine1,
      addressLine2: labels.addressLine2,
      country: labels.country,
      state: labels.state,
      city: labels.city,
      pincode: labels.pincode,
    }),
    selectField("is_active", labels.isActive, activeInactiveSelectOptions(labels.activeLabel, labels.inactiveLabel), "boolean"),
  ];
}

export type SiteMassUpdateLabels = {
  siteName: string;
  client: string;
  addressLine1: string;
  addressLine2: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  what3words: string;
  latitude: string;
  longitude: string;
  isActive: string;
  activeLabel: string;
  inactiveLabel: string;
};

export function buildSiteMassUpdateFields(
  clientOptions: CheckmarkSelectOption[],
  labels: SiteMassUpdateLabels,
): MassUpdateFieldDef[] {
  return [
    titleField("site_name", labels.siteName),
    selectField("client", labels.client, clientOptions, "number"),
    ...addressFields({
      addressLine1: labels.addressLine1,
      addressLine2: labels.addressLine2,
      country: labels.country,
      state: labels.state,
      city: labels.city,
      pincode: labels.pincode,
    }),
    textField("what3words", labels.what3words),
    numberField("latitude", labels.latitude),
    numberField("longitude", labels.longitude),
    selectField("is_active", labels.isActive, activeInactiveSelectOptions(labels.activeLabel, labels.inactiveLabel), "boolean"),
  ];
}

export type QuotationMassUpdateLabels = {
  quoteName: string;
  customer: string;
  site: string;
  primaryContact: string;
  additionalContact: string;
  siteContact: string;
  orderNumber: string;
  dueDate: string;
  salesperson: string;
  projectManager: string;
  technicians: string;
  tags: string;
  description: string;
  status: string;
  isActive: string;
  activeLabel: string;
  inactiveLabel: string;
};

export function buildQuotationMassUpdateFields(
  options: {
    clientOptions: CheckmarkSelectOption[];
    siteOptions: CheckmarkSelectOption[];
    contactOptions: CheckmarkSelectOption[];
    userOptions: CheckmarkSelectOption[];
    tagOptions: CheckmarkSelectOption[];
    statusOptions: CheckmarkSelectOption[];
  },
  labels: QuotationMassUpdateLabels,
): MassUpdateFieldDef[] {
  return [
    titleField("quote_name", labels.quoteName),
    selectField("customer", labels.customer, options.clientOptions, "number"),
    selectField("site", labels.site, options.siteOptions, "number"),
    selectField("primary_customer_contact", labels.primaryContact, options.contactOptions, "number"),
    selectField("additional_customer_contact", labels.additionalContact, options.contactOptions, "number"),
    selectField("site_contact", labels.siteContact, options.contactOptions, "number"),
    textField("order_number", labels.orderNumber),
    { name: "due_date", label: labels.dueDate, valueType: "date", valueFormat: "date-iso" },
    selectField("salesperson", labels.salesperson, options.userOptions, "number"),
    selectField("project_manager", labels.projectManager, options.userOptions, "number"),
    selectField("technicians", labels.technicians, options.userOptions, "number"),
    selectField("tags", labels.tags, options.tagOptions, "number"),
    textareaField("description", labels.description),
    selectField("status", labels.status, options.statusOptions),
    selectField("is_active", labels.isActive, activeInactiveSelectOptions(labels.activeLabel, labels.inactiveLabel), "boolean"),
  ];
}

export type GroupMassUpdateLabels = {
  name: string;
  isActive: string;
  activeLabel: string;
  inactiveLabel: string;
};

export function buildGroupMassUpdateFields(labels: GroupMassUpdateLabels): MassUpdateFieldDef[] {
  return [
    titleField("name", labels.name),
    selectField("is_active", labels.isActive, activeInactiveSelectOptions(labels.activeLabel, labels.inactiveLabel), "boolean"),
  ];
}

export type MaterialRequestMassUpdateLabels = {
  worker: string;
  requestedDate: string;
  status: string;
  notes: string;
};

export function buildMaterialRequestMassUpdateFields(
  options: {
    workerOptions: CheckmarkSelectOption[];
    statusOptions: CheckmarkSelectOption[];
  },
  labels: MaterialRequestMassUpdateLabels,
): MassUpdateFieldDef[] {
  return [
    selectField("worker_name", labels.worker, options.workerOptions, "number"),
    { name: "requested_date", label: labels.requestedDate, valueType: "date", valueFormat: "date-iso" },
    selectField("status", labels.status, options.statusOptions),
    textareaField("notes", labels.notes),
  ];
}

export type ItemMassUpdateLabels = {
  name: string;
  sku: string;
  quantity: string;
  costPrice: string;
  sellingPrice: string;
  isActive: string;
  activeLabel: string;
  inactiveLabel: string;
};

export function buildItemMassUpdateFields(labels: ItemMassUpdateLabels): MassUpdateFieldDef[] {
  return [
    titleField("name", labels.name),
    textField("sku", labels.sku),
    numberField("quantity", labels.quantity),
    numberField("cost_price", labels.costPrice),
    numberField("selling_price", labels.sellingPrice),
    selectField("is_active", labels.isActive, activeInactiveSelectOptions(labels.activeLabel, labels.inactiveLabel), "boolean"),
  ];
}

export type CompositeItemMassUpdateLabels = ItemMassUpdateLabels & {
  group: string;
  installationType: string;
};

export function buildCompositeItemMassUpdateFields(
  options: {
    groupOptions: CheckmarkSelectOption[];
    installationTypeOptions: CheckmarkSelectOption[];
  },
  labels: CompositeItemMassUpdateLabels,
): MassUpdateFieldDef[] {
  return [
    titleField("name", labels.name),
    textField("sku", labels.sku),
    numberField("quantity", labels.quantity),
    numberField("cost_price", labels.costPrice),
    numberField("selling_price", labels.sellingPrice),
    selectField("group", labels.group, options.groupOptions, "number"),
    selectField("installation_type", labels.installationType, options.installationTypeOptions, "number"),
    selectField("is_active", labels.isActive, activeInactiveSelectOptions(labels.activeLabel, labels.inactiveLabel), "boolean"),
  ];
}

export type ProjectMassUpdateLabels = {
  name: string;
  client: string;
  projectType: string;
  description: string;
  startDate: string;
  endDate: string;
  isActive: string;
  activeLabel: string;
  inactiveLabel: string;
};

export function buildProjectMassUpdateFields(
  options: {
    clientOptions: CheckmarkSelectOption[];
    projectTypeOptions: CheckmarkSelectOption[];
  },
  labels: ProjectMassUpdateLabels,
): MassUpdateFieldDef[] {
  return [
    titleField("name", labels.name),
    selectField("client", labels.client, options.clientOptions, "number"),
    selectField("project_type", labels.projectType, options.projectTypeOptions, "number"),
    textareaField("description", labels.description),
    { name: "start_date", label: labels.startDate, valueType: "date", valueFormat: "date-iso" },
    { name: "end_date", label: labels.endDate, valueType: "date", valueFormat: "date-iso" },
    selectField("is_active", labels.isActive, activeInactiveSelectOptions(labels.activeLabel, labels.inactiveLabel), "boolean"),
  ];
}

export type InvoiceMassUpdateLabels = {
  client: string;
  contact: string;
  project: string;
  dueDate: string;
  paymentTerms: string;
  status: string;
  clientNotes: string;
  internalNotes: string;
};

export function buildInvoiceMassUpdateFields(
  options: {
    clientOptions: CheckmarkSelectOption[];
    contactOptions: CheckmarkSelectOption[];
    projectOptions: CheckmarkSelectOption[];
    statusOptions: CheckmarkSelectOption[];
    paymentTermOptions: CheckmarkSelectOption[];
  },
  labels: InvoiceMassUpdateLabels,
): MassUpdateFieldDef[] {
  return [
    selectField("client", labels.client, options.clientOptions, "number"),
    selectField("contact", labels.contact, options.contactOptions, "number"),
    selectField("project", labels.project, options.projectOptions, "number"),
    { name: "due_date", label: labels.dueDate, valueType: "date", valueFormat: "date-iso" },
    selectField("payment_terms", labels.paymentTerms, options.paymentTermOptions),
    selectField("status", labels.status, options.statusOptions),
    textareaField("client_notes", labels.clientNotes),
    textareaField("internal_notes", labels.internalNotes),
  ];
}

export type PurchaseOrderMassUpdateLabels = {
  vendor: string;
  contact: string;
  project: string;
  dueDate: string;
  paymentTerms: string;
  status: string;
  vendorNotes: string;
  internalNotes: string;
};

export function buildPurchaseOrderMassUpdateFields(
  options: {
    vendorOptions: CheckmarkSelectOption[];
    contactOptions: CheckmarkSelectOption[];
    projectOptions: CheckmarkSelectOption[];
    statusOptions: CheckmarkSelectOption[];
    paymentTermOptions: CheckmarkSelectOption[];
  },
  labels: PurchaseOrderMassUpdateLabels,
): MassUpdateFieldDef[] {
  return [
    selectField("vendor", labels.vendor, options.vendorOptions, "number"),
    selectField("contact", labels.contact, options.contactOptions, "number"),
    selectField("project", labels.project, options.projectOptions, "number"),
    { name: "due_date", label: labels.dueDate, valueType: "date", valueFormat: "date-iso" },
    selectField("payment_terms", labels.paymentTerms, options.paymentTermOptions),
    selectField("status", labels.status, options.statusOptions),
    textareaField("vendor_notes", labels.vendorNotes),
    textareaField("internal_notes", labels.internalNotes),
  ];
}

export type QrCodeMassUpdateLabels = {
  status: string;
  assignedTo: string;
};

export function buildQrCodeMassUpdateFields(
  options: {
    statusOptions: CheckmarkSelectOption[];
    jobOptions: CheckmarkSelectOption[];
  },
  labels: QrCodeMassUpdateLabels,
): MassUpdateFieldDef[] {
  return [
    selectField("status", labels.status, options.statusOptions),
    selectField("assigned_to_id", labels.assignedTo, options.jobOptions, "number"),
  ];
}
