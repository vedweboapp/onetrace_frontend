  import { parseFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
  import type { Job, JobCreatePayload, JobFormRef } from "@/features/jobs/types/job.types";
  import type { JobFormValues } from "@/features/jobs/schemas/job-form-schema";
  import { getJobAssignedWorkerId, jobChecklistEntries } from "@/features/jobs/utils/job-nested-fields.util";
  import { buildJobMetaPayload, normalizeJobMeta } from "@/features/jobs/utils/job-meta-payload.util";

  export function formatApiDateTimeForHtmlDatetimeLocal(raw: string | null | undefined): string {
    const d = parseFlexibleApiDate(raw);
    if (!d) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day}T${h}:${min}`;
  }

  export function htmlDatetimeLocalToIso(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return trimmed;
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) return trimmed;
    return d.toISOString();
  }

  function parseOptionalIdField(raw: string): number | undefined {
    const s = raw.trim();
    if (!s || !/^\d+$/.test(s)) return undefined;
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }

  function parseFormIdList(ids: string[]): number[] | undefined {
    const parsed = ids
      .map((raw) => Number.parseInt(raw, 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    const unique = [...new Set(parsed)];
    return unique.length > 0 ? unique : undefined;
  }

  function nestedId(value: number | { id: number } | null | undefined): number | undefined {
    if (value == null) return undefined;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
    if (typeof value === "object" && typeof value.id === "number" && value.id > 0) return value.id;
    return undefined;
  }

  function jobFormProjectFormId(entry: JobFormRef | unknown): string {
    if (typeof entry === "number") {
      return entry > 0 ? String(entry) : "";
    }
    if (!entry || typeof entry !== "object") return "";

    const rawId =
      (entry as any).dynamic_form_id ??
      (entry as any).project_form_id ??
      (entry as any).form_id ??
      (typeof (entry as any).dynamic_form === "object" ? (entry as any).dynamic_form?.id : (entry as any).dynamic_form) ??
      (typeof (entry as any).project_form === "object" ? (entry as any).project_form?.id : (entry as any).project_form) ??
      (entry as any).id ??
      (entry as any).job_form_id;

    if (rawId == null) return "";
    const num = typeof rawId === "number" ? rawId : Number.parseInt(String(rawId), 10);
    return Number.isFinite(num) && num > 0 ? String(num) : "";
  }

  export function jobFormsToFormIds(forms: Job["forms"]): string[] {
    if (forms == null) return [];
    if (typeof forms === "number" && forms > 0) return [String(forms)];
    if (Array.isArray(forms)) {
      return forms
        .map((entry) => {
          if (typeof entry === "number" && entry > 0) return String(entry);
          if (entry && typeof entry === "object") return jobFormProjectFormId(entry);
          return "";
        })
        .filter((id) => id.length > 0);
    }
    if (typeof forms === "object") {
      const id = jobFormProjectFormId(forms);
      return id ? [id] : [];
    }
    return [];
  }

  export function jobFormSelectOptions(forms: Job["forms"]): Array<{ value: string; label: string }> {
    if (forms == null) return [];
    const entries: unknown[] = [];
    if (typeof forms === "number" && forms > 0) {
      entries.push({ id: forms, project_form_id: forms });
    } else if (Array.isArray(forms)) {
      for (const entry of forms) {
        if (typeof entry === "number" && entry > 0) {
          entries.push({ id: entry, project_form_id: entry });
        } else if (entry && typeof entry === "object") {
          entries.push(entry);
        }
      }
    } else if (typeof forms === "object") {
      entries.push(forms);
    }
    return entries
      .map((entry) => {
        const value = jobFormProjectFormId(entry);
        if (!value) return null;
        const name = (entry as any).name ?? (entry as any).project_form_name ?? (entry as any).title;
        return {
          value,
          label: typeof name === "string" && name.trim() ? name.trim() : `#${value}`,
        };
      })
      .filter((row): row is { value: string; label: string } => row != null);
  }

  export function mapJobFormToPayload(
    values: JobFormValues,
  ): JobCreatePayload {
    const job_meta = buildJobMetaPayload(values.job_meta_items);

    const payload: JobCreatePayload = {
      // title: values.title.trim(),
      description: values.description.trim(),
    };

    const workerId = values.assigned_worker.trim();
    if (workerId && /^\d+$/.test(workerId)) {
      payload.assigned_worker = Number.parseInt(workerId, 10);
    }

    if (values.start_date.trim()) {
      payload.start_date = htmlDatetimeLocalToIso(values.start_date);
    }

    const categoryNorm = (values.job_category ?? "").toLowerCase().replace(/[^a-z]/g, "");

    const forms = parseFormIdList(values.forms);
    if (forms != null && categoryNorm !== "projectjob") payload.forms = forms;

    const checklists = parseFormIdList(values.checklists ?? []);
    if (checklists != null) payload.checklists = checklists;

    const job_status = parseOptionalIdField(values.job_status);
    if (job_status != null) payload.job_status = job_status;

    const client = parseOptionalIdField(values.client);
    if (client != null) payload.client = client;

    const project = parseOptionalIdField(values.project);
    if (project != null) payload.project = project;

    const site = parseOptionalIdField(values.site);
    if (site != null) payload.site = site;

    if (values.job_category?.trim()) {
      payload.job_category = values.job_category.trim();
    }

    if (job_meta && categoryNorm !== "projectjob") {
      payload.job_meta = job_meta;
    }

    return payload;
  }

  export function emptyJobFormDefaults(category?: string): JobFormValues {
    return {
      description: "",
      forms: [],
      job_status: "",
      checklists: [],
      client: "",
      project: "",
      site: "",
      assigned_worker: "",
      start_date: "",
      job_category: category ?? "",
      job_meta_items: [{ group: "", group_name: "", item: "", item_name: "", quantity: "", rate: "" }],
    };
  }

  export function jobToFormDefaults(job: Job): JobFormValues {
    const meta = normalizeJobMeta(job.job_meta);
    const compositeItems =
      meta?.composite_items?.map((row) => {
        const itemId =
          typeof row.id === "number"
            ? row.id
            : typeof row.item === "number"
              ? row.item
              : row.item && typeof row.item === "object"
                ? row.item.id
                : undefined;
        const groupId =
          typeof row.group === "number"
            ? row.group
            : row.group && typeof row.group === "object"
              ? row.group.id
              : undefined;
        const groupName =
          row.group && typeof row.group === "object" ? (row.group.name ?? "") : "";
        const itemName =
          row.name?.trim() ||
          (row.item && typeof row.item === "object" ? (row.item.name?.trim() ?? "") : "");
        const qty = row.quantity != null && row.quantity > 0 ? row.quantity : 1;
        let rate = "";
        if (row.amount != null && Number.isFinite(row.amount) && qty > 0) {
          rate = String(Number((row.amount / qty).toFixed(4)));
        } else if (row.selling_price != null) {
          rate = String(row.selling_price);
        } else if (row.item && typeof row.item === "object" && row.item.selling_price != null) {
          rate = String(row.item.selling_price);
        }
        return {
          group: groupId != null ? String(groupId) : "",
          group_name: groupName,
          item: itemId != null ? String(itemId) : "",
          item_name: itemName,
          quantity: row.quantity != null ? String(row.quantity) : "",
          rate,
        };
      }) ?? [];

    return {
      description: job.description ?? "",
      forms: jobFormsToFormIds(job.forms),
      job_status: String(
        typeof job.job_status === "number"
          ? job.job_status
          : job.job_status && typeof job.job_status === "object" && "id" in job.job_status
            ? (job.job_status as { id: number }).id
            : "",
      ),
      client: String(nestedId(job.client) ?? ""),
      project: String(nestedId(job.project) ?? ""),
      site: String(nestedId(job.site) ?? ""),
      checklists: jobChecklistEntries(job).map((c) => String(c.id)),
      assigned_worker: String(getJobAssignedWorkerId(job) ?? ""),
      start_date: formatApiDateTimeForHtmlDatetimeLocal(job.start_date),
      job_category: job.job_category ?? "",
      job_meta_items:
        compositeItems.length > 0
          ? compositeItems
          : [{ group: "", group_name: "", item: "", item_name: "", quantity: "", rate: "" }],
    };
  }
