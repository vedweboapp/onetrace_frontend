import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MapPin,
  Search,
  Moon,
  Sun,
  Menu,
  X,
  ArrowRight,
  Boxes,
  LogIn,
  Compass,
  SquareStack,
  BookOpen,
  Workflow,
  ShieldCheck,
  Settings2,
  ListChecks,
  Users,
  Lightbulb,
  Network,
  LifeBuoy,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

/**
 * SimHo Documentation
 * -----------------------------------------------------------------------
 * Drop this component anywhere in a React / Next.js + Tailwind project.
 * Dark mode is class-based: this component manages its own `dark` class
 * on a wrapping <div>, so it works standalone even if your app doesn't
 * have Tailwind's `darkMode: "class"` wired up globally — but if it does,
 * feel free to remove the local wrapper and drive it from your app shell.
 *
 * No external content dependency — the guide text lives in the SECTIONS
 * array below, so this file is self-contained.
 */

/* ------------------------------------------------------------------ */
/*  Content model                                                      */
/* ------------------------------------------------------------------ */

type Block =
  | { type: "p"; text: string }
  | { type: "label"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "note"; title?: string; text: string }
  | { type: "h3"; text: string };

interface DocSection {
  id: string;
  num: string;
  title: string;
  icon: LucideIcon;
  dek: string;
  blocks: Block[];
}

const p = (text: string): Block => ({ type: "p", text });
const label = (text: string): Block => ({ type: "label", text });
const ul = (items: string[]): Block => ({ type: "ul", items });
const ol = (items: string[]): Block => ({ type: "ol", items });
const h3 = (text: string): Block => ({ type: "h3", text });
const table = (headers: string[], rows: string[][]): Block => ({
  type: "table",
  headers,
  rows,
});
const note = (text: string, title?: string): Block => ({
  type: "note",
  text,
  title,
});

type SearchResult = {
  sectionId: string;
  title: string;
  text: string;
};

const buildSearchResults = (query: string): SearchResult[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const results: SearchResult[] = [];
  const seen = new Set<string>();

  SECTIONS.forEach((section) => {
    const candidates = [{ text: section.title }, { text: section.dek }];

    section.blocks.forEach((block) => {
      switch (block.type) {
        case "p":
        case "label":
        case "h3":
        case "note":
          candidates.push({ text: block.text });
          break;
        case "ul":
        case "ol":
          block.items.forEach((item) => candidates.push({ text: item }));
          break;
        case "table":
          block.headers.forEach((header) => candidates.push({ text: header }));
          block.rows.flat().forEach((cell) => candidates.push({ text: cell }));
          break;
      }
    });

    candidates.forEach((candidate) => {
      if (candidate.text.toLowerCase().includes(normalizedQuery)) {
        const key = `${section.id}:${candidate.text}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({ sectionId: section.id, title: section.title, text: candidate.text });
        }
      }
    });
  });

  return results.slice(0, 12);
};

const highlightMatch = (text: string, query: string) => {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return text;

  const parts = text.split(new RegExp(`(${normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"));

  return parts.map((part, index) => {
    const isMatch = part.toLowerCase() === normalizedQuery.toLowerCase();
    return isMatch ? (
      <mark
        key={`${part}-${index}`}
        className="rounded-sm px-0.5"
        style={{ backgroundColor: "color-mix(in srgb, var(--dash-accent, #111111) 25%, transparent)" }}
      >
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    );
  });
};

/* ------------------------------------------------------------------ */
/*  Guide content                                                      */
/* ------------------------------------------------------------------ */

const SECTIONS: DocSection[] = [
  {
    id: "what-is-simho",
    num: "01",
    title: "What SimHo is",
    icon: Boxes,
    dek: "The central hub between office teams and field operatives.",
    blocks: [
      p(
        "SimHo is a comprehensive construction management platform that enables construction and service companies to manage clients, sites, contacts, quotations, projects, drawings, field operations, and operatives from a single system. It acts as the central hub between office teams and field operatives, streamlining communication, planning, execution, and project delivery."
      ),
      ul([
        "Manage clients, sites, and contacts",
        "Plan and deliver projects with floor drawings and location pins",
        "Create service and project jobs, fill forms, and run quality assurance",
        "Prepare quotes, invoices, and purchase orders",
        "Request, dispatch, and return materials",
        "Track products (items, composite items, groups) and QR codes",
        "Configure statuses, types, forms, users, and integrations under Settings",
      ]),
    ],
  },
  {
    id: "getting-started",
    num: "02",
    title: "Getting started",
    icon: LogIn,
    dek: "Sign in, get oriented, and learn the shell.",
    blocks: [
      h3("2.1 Sign in"),
      ol([
        "Open the SimHo login page.",
        "Enter your email and password.",
        "Use Forgot password if you need a reset.",
      ]),
      p(
        "Your administrator creates users under Settings → Users and assigns a role (for example technician, manager, or sales). Roles mainly control who appears in assignment pickers — workers, quote assignees, and similar."
      ),
      h3("2.2 Main layout"),
      table(
        ["Area", "What it does"],
        [
          ["Left sidebar", "Jump between modules — Clients, Projects, Jobs, and so on"],
          ["Top bar", "Settings and your profile"],
          ["Main area", "Lists, detail pages, and forms for the module you selected"],
        ]
      ),
      note(
        "Many lists support search, filters, and pagination. Use the back arrow on detail pages to return to the previous screen — for example, pin details return to the project Locations tab when opened from there. Language and appearance can be adjusted under Settings → Personal Profile.",
        "Tips"
      ),
    ],
  },
  {
    id: "navigation-map",
    num: "03",
    title: "Navigation map",
    icon: Compass,
    dek: "What lives in the sidebar, grouped by job.",
    blocks: [
      h3("Core CRM"),
      table(
        ["Menu", "Use it for"],
        [
          ["Clients", "Customer organisations"],
          ["Vendors", "Suppliers"],
          ["Contacts", "People linked to clients or vendors"],
          ["Sites", "Physical locations under a client"],
        ]
      ),
      h3("Commercial"),
      table(
        ["Menu", "Use it for"],
        [
          ["Quotes → Service Quote", "Lighter service proposals"],
          ["Quotes → Project Quote", "Project-scoped proposals — levels, pins, composites"],
          ["Invoices", "Client billing"],
          ["Purchase orders", "Buying from vendors"],
        ]
      ),
      h3("Delivery & field"),
      table(
        ["Menu", "Use it for"],
        [
          ["Jobs → Service", "Service jobs"],
          ["Jobs → Project", "Project jobs"],
          ["QR codes", "Generate batches and assign codes to jobs"],
          ["Projects", "Central delivery hub — drawings, locations, jobs, forms"],
        ]
      ),
      h3("Catalog & logistics"),
      table(
        ["Menu", "Use it for"],
        [
          ["Groups", "Catalog grouping"],
          ["Products → Items", "Stock / SKU-style products"],
          ["Products → Composite items", "Grouped catalogue lines used on drawings, quotes, and POs"],
          ["Material Requests", "Request materials for jobs"],
          ["Dispatches", "Fulfil material requests"],
          ["Returns", "Return unused stock to inventory"],
        ]
      ),
      h3("Settings"),
      p("Open the gear icon to manage workspace configuration — statuses, types, forms, users, Zoho, and more."),
    ],
  },
  {
    id: "screen-patterns",
    num: "04",
    title: "Common screen patterns",
    icon: SquareStack,
    dek: "Learn the pattern once, reuse it everywhere.",
    blocks: [
      p("Most modules follow the same pattern so teams learn once and reuse everywhere."),
      h3("4.1 List → Detail → Create / Edit"),
      ol([
        "List — browse, search, filter, select rows.",
        "Detail — read-only overview, often with tabs.",
        "New / Edit — create or update a record, then save.",
      ]),
      h3("4.2 Mass actions"),
      p("On many lists you can:"),
      ol([
        "Select one or more rows (or select all).",
        "Use the mass-action bar to update, delete, or export.",
        "Choose a field to update — for example status or site — set the value, and apply.",
      ]),
      note("Job mass update does not include a form field. Forms are managed on the job or pin, not via job mass update.", "Note for jobs"),
      h3("4.3 Detail tabs"),
      p("Rich records use tabs. Examples:"),
      ul([
        "Project — Overview, Forms, Drawings, Jobs, Locations, Quotes, Job Sheets, Docs, Approvals",
        "Job — Overview, Materials, Dispatch, Returns",
        "Client — Overview, Contacts, Sites",
        "Material request — Overview, Dispatch, Timeline",
      ]),
      h3("4.4 Quick create from related screens"),
      p("While filling a form — for example creating a project — you can often create a related record (client, site, contact) and return to the original form with the new value selected."),
    ],
  },
  {
    id: "module-guide",
    num: "05",
    title: "Module guide",
    icon: BookOpen,
    dek: "Every module, what it's for, and how it's typically used.",
    blocks: [
      h3("5.1 Clients"),
      p("Purpose — master record for each customer organisation."),
      label("Typical flow"),
      ol([
        "Create a client (name, contact details, address).",
        "Add contacts and sites from the client detail tabs, or from their own modules.",
        "Use the client on projects, quotes, invoices, and jobs.",
      ]),
      label("Detail tabs"),
      p("Overview · Contacts · Sites"),
      label("Also useful"),
      p("Activate / deactivate, mass update, export."),

      h3("5.2 Vendors"),
      p("Purpose — suppliers you buy from."),
      label("Typical flow"),
      ol([
        "Create a vendor, optionally with a vendor type from Settings.",
        "Add vendor contacts.",
        "Create purchase orders against the vendor.",
      ]),
      label("Detail tabs"),
      p("Details · Contacts"),

      h3("5.3 Contacts"),
      p("Purpose — people linked to clients or vendors."),
      label("How to use"),
      ul([
        "Open Contacts and switch between Client and Vendor contact views.",
        "Assign contacts when creating quotes, POs, or client/vendor records.",
        "Prefer creating contacts under the parent client/vendor so relationships stay correct.",
      ]),

      h3("5.4 Sites"),
      p("Purpose — physical locations belonging to a client, with address and map."),
      label("Why it matters"),
      p("Sites connect clients to projects, quotes, and jobs. Create the client first, then the site(s)."),

      h3("5.5 Projects — the central hub"),
      p("Purpose — the main delivery container for drawings, pins, jobs, forms, and project quotes."),
      label("Create a project"),
      ol([
        "Go to Projects, then click Add.",
        "Fill in the fields (see below).",
        "Click Save to create the project and open its detail page.",
      ]),
      table(
        ["Field", "Required", "Description"],
        [
          ["Project Name", "Required", "The name of the project"],
          ["Client", "Required", "The customer this project belongs to"],
          ["Project Type", "Required", "Determines which forms are available for this project"],
          ["Status", "Required", "The project's current status"],
          ["Forms", "Conditional", "Selectable based on the chosen project type"],
          ["Site(s)", "Required", "Filtered to the sites belonging to the selected client"],
          ["Manager", "Optional", "Assign a project manager if you choose to"],
          ["Description", "Required", "Free text describing the project"],
          ["Start Date", "Required", "Date picker"],
          ["End Date", "Optional", "Date picker"],
        ]
      ),
      label("Detail tabs and what to do in each"),
      table(
        ["Tab", "What you do"],
        [
          ["Overview", "Core project info — name, start/end date, client, and other basics"],
          ["Forms", "Shows the form(s) selected on creation; use Assign Form for more, tied to the project type"],
          ["Drawings", "Upload floor plans / blueprints and open the drawing editor"],
          ["Jobs", "View and manage jobs created for this project — mass actions available"],
          ["Locations", "Browse pins by drawing / level; open pin details; create jobs from locations"],
          ["Quotes", "Project-related quotes"],
          ["Job Sheets / Docs / Approvals", "Supporting project documents and approval views"],
        ]
      ),
      label("Drawings tab"),
      p("Holds the drawing files that represent the floor plan(s) / schema for the project. Both PDF and image files are supported."),
      ol([
        "Click Add to open the Upload Drawing dialog.",
        "Select one or multiple files (PDF or image) to upload at the same time.",
        "Each selected file gets a Name field — it defaults to the filename, but you can edit it before uploading.",
        "Click Upload Drawing to upload the selected file(s).",
        "After uploading, the drawing opens in the Drawing Editor — the graphical editor used to add plots and pins on top of the drawing.",
      ]),
      label("Drawing editor"),
      p("A layer-based workspace built on PDF drawings and supported file formats. Teams create virtual work areas (plots) using tools such as the Box Tool and Pen Tool. Pins are then placed within these plots to represent work locations. Each pin can contain a composite item / product, quantity, level or plot information, forms for operatives, attachments, and product guidance documents. The editor supports zoom controls, keyboard shortcuts, and tool shortcuts shown on hover."),
      label("Toolbar (bottom of the editor)"),
      ul([
        "Zoom In / Zoom Out — zoom controls for the drawing view",
        "Group — select a composite group, then pick a composite item from within it",
        "Select composite item — pick a single item directly from the full catalog",
        "Variation toggle — mark or select a variation for the chosen composite item",
        "Pen tool — draw a freeform plot (work area) on the drawing",
        "Box tool — draw a rectangular plot (work area) on the drawing",
        "Pin tool — place a pin inside a plot, after a composite item has been selected",
        "Hand tool — click and drag to pan / move around the drawing",
        "Select tool — click plots or pins to select them, or drag to reposition an existing pin",
      ]),
      ol([
        "Open a drawing from the Drawings tab.",
        "Use the Pen or Box tool to draw a plot (work area) on the drawing.",
        "Select a composite item (by group or from the full catalog), then use the Pin tool to place pins within the plot.",
        "Use the Hand tool to pan around the drawing, and the Select tool to click, select, or reposition existing pins.",
        "Save pin changes.",
      ]),
      label("Jobs tab"),
      p("Purpose — holds the jobs created for this specific project, in a tabular view."),
      ul([
        "Search — search across the job list.",
        "Filters — filter the job list by the available criteria.",
        "Mass actions — select multiple jobs (or all) to mass update, mass delete, mass export, or mass assign worker.",
      ]),
      label("Locations tab"),
      p("Purpose — holds the full list of pins inside the project, organized by hierarchy: Project (root) → Drawing → Plot → Pin. It is not independent per drawing — it shows every pin across the whole project in one tabular view."),
      label("Filtering"),
      p("Filter the pin list by Quotation Status, Job Status, Labels, and Plot."),
      label("Selecting pins"),
      ul([
        "Each pin row has a checkbox for individual selection.",
        "Mass-select using the checkbox at the Plot, Drawing, or Project (root) level — selecting one of these selects every pin underneath it in the hierarchy.",
      ]),
      label("Mass update"),
      p("With pins selected, use mass update to change their Form, Quantity, or toggle their Variation."),
      label("Create Job from Locations"),
      ol([
        "Filter pins as needed — for example, by Quotation Approved — then select the pins you want to create a job from.",
        "Click Create Job.",
        "If any selected pins already belong to an existing job, a warning appears — those pins are skipped, confirming continues with the remaining eligible pins.",
        "If none of the selected pins belong to an existing job, the Create Job dialog opens directly.",
        "Fill in the Create Job fields (see below).",
        "Click Save / Create — the job is created and you're redirected to the new job detail page.",
      ]),
      table(
        ["Field", "Notes"],
        [
          ["Start Date", "Required — date picker"],
          ["Site", "Required — dropdown"],
          ["Assigned Worker", "Required — the operative assigned to the job"],
          ["Checklist", "Select the checklist to attach to the job"],
          ["Job Status", "Defaults to To Do"],
        ]
      ),
      label("Pin detail page"),
      ul([
        "Left — assigned form (fill or view submission); long forms scroll independently.",
        "Right — pin details: product, attachments, quantity, status, coordinates, QA when decided.",
        "Form images also appear at the bottom of the pin details column for quick review.",
        "The back arrow returns to the project Locations tab when the pin was opened from there.",
      ]),
      label("Quotes, Job Sheets, Docs, and Approvals tabs"),
      ul([
        "Quotes — shows the quotations that are part of this project's jobs; fully developed and in use.",
        "Job Sheets, Docs, Approvals — currently a work in progress.",
      ]),

      h3("5.6 Quotes"),
      p("Purpose — commercial proposals."),
      table(
        ["Type", "Best for"],
        [
          ["Service Quote", "Service-oriented work — client / site focused"],
          ["Project Quote", "Project scope with levels, pins, and composite items"],
        ]
      ),
      label("Typical flow"),
      ol([
        "Create a quote from Quotes, or from a project (Quote project).",
        "Select client, site, project (as needed), line items / composites, and assignees.",
        "Update status, export (PDF / Excel / CSV), or send as your process requires.",
        "Review the public pin preview when sharing scoped pin content.",
      ]),
      p("Quotes can be created from the Quotes module or directly from a Project using the Quote action. Status updates and PDF / Excel / CSV export remain available. Project Quote PDFs can include drawing snapshots and hyperlinks that let clients open a public view of scoped pins."),

      h3("5.7 Invoices"),
      p("Purpose — bill clients."),
      label("Typical flow"),
      ol([
        "Create an invoice linked to the client (and project context when used).",
        "Add line items on the Line items tab.",
        "Preview, download PDF, or send.",
        "Use list mass update / export when processing many invoices.",
      ]),

      h3("5.8 Purchase orders"),
      p("Purpose — order goods from vendors for projects or catalog items."),
      label("Typical flow"),
      ol([
        "Create a PO with vendor, optional project, and line items (items / groups).",
        "Enter unit price and quantity — amount is calculated from those values.",
        "Review Overview and Line items tabs; track status through your purchasing process.",
      ]),

      h3("5.9 Jobs"),
      p("Purpose — units of field work, split into Service and Project jobs in the sidebar."),
      label("Create jobs"),
      ul([
        "From Jobs → New, or",
        "From a project's Locations tab — create a job from selected pins / locations.",
      ]),
      label("On the job detail page"),
      table(
        ["Area", "What you do"],
        [
          ["Overview", "Status, workers, dates, related client / site / project"],
          ["Forms / checklists", "Fill assigned forms"],
          ["Drawings & pins", "Open pin detail under the job when pins are linked"],
          ["Materials / Dispatch / Returns", "Request and track materials for this job"],
          ["Quality assurance", "Approve or reject QA when shown"],
          ["QR codes", "Assign or view codes linked to the job"],
        ]
      ),
      note("You can mass-update fields such as title, description, client, project, site, status, and start date. The form field is not part of job mass update — assign and complete forms on the job or pin instead.", "Mass update on jobs"),
      label("Service vs. Project jobs"),
      p("Jobs are the operational tasks assigned to field operatives to deliver services for clients. SimHo provides two job types:"),
      ul([
        "Service Jobs — manually created jobs that are independent of project pins. Typically used for surveys, inspections, or other standalone field activities.",
        "Project Jobs — jobs created from a Project by selecting one or more pins across one or multiple drawings. A collection of selected pins becomes a single job, assigned to an operative.",
      ]),
      p("On the Job Detail page, operatives can view every pin included in the job together with a preview of its location on the project drawing. Each pin displays the assigned product or composite item, required quantity, forms to complete, and any product guidance or attachment documents needed to perform the work."),
      label("Project workflow"),
      ol([
        "Complete the work for each assigned pin.",
        "Submit the required forms for every completed pin.",
        "Once all pins in the job are completed, mark the entire job as complete.",
        "The completed job is then available for review and approval by the administrator or managing director, as part of the quality and completion process.",
      ]),

      h3("5.10 QR codes"),
      p("Purpose — generate batches of QR codes, assign them to jobs, and track scans."),
      label("Typical flow"),
      ol([
        "Generate a batch (quantity and batch number).",
        "Assign codes to a job.",
        "Monitor scan count / last scanned on the list or job.",
      ]),

      h3("5.11 Groups, Items, Composite items"),
      p("Purpose — the product catalog used across drawings, quotes, POs, and material flows."),
      table(
        ["Module", "Role"],
        [
          ["Groups", "Named buckets for organising composites"],
          ["Items", "Individual products / SKUs, with unit types"],
          ["Composite items", "Bundled catalogue lines placed on drawings and quotes"],
        ]
      ),
      p("Keep catalog data clean before placing pins or building quotes — pin product names and quote lines come from here."),

      h3("5.12 Material Requests → Dispatches → Returns"),
      p("Purpose — move materials from warehouse to field and back."),
      label("Recommended sequence"),
      ol([
        "Material Request — create a request for the job / materials needed; track status using Material Statuses from Settings; open detail → Overview / Dispatch / Timeline.",
        "Dispatch — from the request, dispatch quantities per line; review records under Dispatches.",
        "Returns — return unused materials to stock via Returns, or return actions on a dispatch; job detail also mirrors Materials / Dispatch / Returns for field visibility.",
      ]),
    ],
  },
  {
    id: "workflows",
    num: "06",
    title: "End-to-end workflows",
    icon: Workflow,
    dek: "Five real sequences, start to finish.",
    blocks: [
      h3("Workflow A — New client project to field completion"),
      ol([
        "Settings — confirm project types, pin statuses, job statuses, checklist types, and forms exist.",
        "Clients — create client → add contacts → add sites.",
        "Projects — create project linked to client and site(s).",
        "Catalog — ensure items / composite items / groups are ready.",
        "Drawings — upload drawings; place pins (product, qty, status, form).",
        "Locations — review pins; open pin details to verify forms / images.",
        "Jobs — create project jobs from locations; assign technicians and dates.",
        "Forms — technicians fill forms on job / pin detail.",
        "QA — approve or reject quality assurance on the job / pin.",
        "Materials (if needed) — material request → dispatch → return leftovers.",
        "Close — update job and project statuses when work is complete.",
      ]),
      h3("Workflow B — Quote a project"),
      ol([
        "Complete enough project scope (drawings / pins / composites) for accurate pricing.",
        "From the project, start a Project Quote — or create one under Quotes → Project Quote.",
        "Select client, site, project, and scoped lines.",
        "Export / send; track status on the Quotes list and project Quotes tab.",
      ]),
      h3("Workflow C — Service work without a full project build"),
      ol([
        "Create Client and Site.",
        "Create a Service Quote if commercial approval is needed.",
        "Create a Service Job.",
        "Assign workers, fill forms, update status, optionally use materials and QR codes.",
      ]),
      h3("Workflow D — Buy materials from a vendor"),
      ol([
        "Create Vendor (+ vendor type) and contacts.",
        "Ensure Items / Groups exist.",
        "Create a Purchase Order with vendor, project (optional), and line items.",
        "Track fulfilment outside or alongside material request / dispatch processes, as your team defines.",
      ]),
      h3("Workflow E — QR tracking on a job"),
      ol([
        "Generate a QR batch.",
        "Assign codes to the target job.",
        "Use scan activity for field tracking and audit.",
      ]),
    ],
  },
  {
    id: "quality-assurance",
    num: "07",
    title: "Quality assurance",
    icon: ShieldCheck,
    dek: "The formal gate between field completion and sign-off.",
    blocks: [
      p("QA appears on job and pin contexts when quality review is required."),
      label("How it works"),
      ol([
        "While QA is not decided, use Yes (approve) or No (reject).",
        "Rejection typically requires remarks.",
        "After a decision, the record shows status (for example Approved / Rejected), who decided, and when.",
        "On pin detail, decided QA appears in the pin details column.",
      ]),
      note("Use QA as the formal gate between field completion and sign-off."),
    ],
  },
  {
    id: "settings",
    num: "08",
    title: "Settings",
    icon: Settings2,
    dek: "For administrators — configure the workspace before heavy use.",
    blocks: [
      p("Configure the workspace before heavy operational use. Path: Settings."),
      h3("8.1 People & company"),
      table(
        ["Setting", "Purpose"],
        [
          ["Personal Profile", "Your profile, language, appearance"],
          ["Company Settings", "Organisation-level details"],
          ["Users", "Create users and assign roles"],
        ]
      ),
      h3("8.2 Customization — statuses & types"),
      table(
        ["Setting", "Affects"],
        [
          ["Project Types", "Project classification; linked to forms / checklists"],
          ["Installation Types", "Installation classification"],
          ["Vendor Types", "Vendor classification"],
          ["Unit Types", "Units for catalog items"],
          ["Checklist Types", "Checklists used on jobs"],
          ["Project / Pin / Job / Material Statuses", "Workflow labels and colours"],
          ["Tags", "Labelling pins and related records"],
          ["Titles", "Title options used on projects / related forms"],
        ]
      ),
      h3("8.3 Forms & modules"),
      table(
        ["Setting", "Purpose"],
        [
          ["Modules", "Custom modules and layouts (form builder)"],
          ["Project forms", "Forms associated with project types / job use"],
        ]
      ),
      p("Design forms here; assign them to pins / jobs in project and job flows."),
      h3("8.4 Integrations — Zoho Inventory"),
      p("Connect Zoho Inventory to sync resources such as items, customers / contacts, vendors, and purchase orders."),
      label("High-level steps"),
      ol([
        "Open Settings → Integrations.",
        "Connect / authorise Zoho.",
        "Map Zoho fields to SimHo fields (key mapping) — mapping must be saved before sync is useful.",
        "Optionally pull historical records.",
        "Configure webhooks as required so new Zoho changes continue to sync.",
      ]),
    ],
  },
  {
    id: "setup-order",
    num: "09",
    title: "Recommended setup order",
    icon: ListChecks,
    dek: "The checklist for onboarding a brand-new workspace.",
    blocks: [
      p("Use this checklist when onboarding a client team:"),
      ol([
        "Company settings and users / roles",
        "Customization — types, statuses, tags, titles, unit types, checklist types",
        "Forms and project-form assignments",
        "Catalog — groups → items → composite items",
        "Clients → contacts → sites",
        "Vendors → vendor contacts (if purchasing)",
        "First project → drawings → pins",
        "Quote / job processes",
        "Material request → dispatch → return (if warehouse is in scope)",
        "QR batches (if tracking is in scope)",
        "Zoho integration (if required)",
      ]),
    ],
  },
  {
    id: "roles",
    num: "10",
    title: "Roles on the team",
    icon: Users,
    dek: "A practical guide to who lives where in the product.",
    blocks: [
      table(
        ["Role focus", "Typical modules"],
        [
          ["Sales / account", "Clients, Contacts, Sites, Quotes, Invoices"],
          ["Project manager", "Projects, Drawings, Locations, Jobs, Quotes, QA"],
          ["Technician / field", "Jobs, Forms, Pin detail, Materials on job, QR"],
          ["Warehouse", "Items, Material Requests, Dispatches, Returns, POs"],
          ["Purchasing", "Vendors, Purchase orders, Items / Groups"],
          ["Admin", "Settings, Users, Customization, Forms, Integrations"],
        ]
      ),
    ],
  },
  {
    id: "everyday-tips",
    num: "11",
    title: "Everyday tips",
    icon: Lightbulb,
    dek: "Small habits that keep a workspace healthy.",
    blocks: [
      ul([
        "Keep statuses consistent — don't invent free-text status when a configured status exists.",
        "Place pins with the correct product / composite before quoting or creating jobs.",
        "Open pin detail to verify forms and images before sending crews.",
        "Prefer creating jobs from Locations so pins stay linked to field work.",
        "Use mass update for bulk status or assignment changes; use detail pages for forms and one-off edits.",
        "When something \"missing\" appears in a picker (form, status, type), check Settings first.",
        "Service vs. Project Quotes and Jobs stay separated in the sidebar — use the matching category for reporting clarity.",
      ]),
    ],
  },
  {
    id: "module-connections",
    num: "12",
    title: "Module connection summary",
    icon: Network,
    dek: "How every module feeds the next.",
    blocks: [],
  },
  {
    id: "support",
    num: "13",
    title: "Support & handover notes",
    icon: LifeBuoy,
    dek: "Handing this guide to a client team.",
    blocks: [
      p("When handing this guide to a client team:"),
      ol([
        "Walk through Workflow A once with sample data.",
        "Confirm Settings values match the client's real statuses and types.",
        "Train field users on Jobs, Forms, and Pin detail.",
        "Train warehouse users on Material Requests → Dispatches → Returns.",
        "Train admins on Customization, Users, and Integrations.",
      ]),
      p("For product or configuration questions, contact your SimHo implementation owner or support contact."),
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */

const ACCENT_COLOR = "var(--dash-accent, #111111)";

function Pin({ children, size = "md" }: { children: React.ReactNode; size?: "sm" | "md" }) {
  const dims = size === "sm" ? "h-5 w-5 text-[10px]" : "h-7 w-7 text-xs";
  return (
    <span
      className={`relative inline-flex ${dims} shrink-0 items-center justify-center rounded-full font-mono font-semibold text-white`}
      style={{
        backgroundColor: ACCENT_COLOR,
        boxShadow: `0 0 0 3px color-mix(in srgb, ${ACCENT_COLOR} 15%, transparent)`,
      }}
    >
      {children}
    </span>
  );
}

function ChainNode({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-sky-800/60 bg-sky-950/60 px-2.5 py-1.5 font-mono text-[11px] font-medium text-sky-200 dark:border-sky-800/60 dark:bg-sky-950/60 dark:text-sky-200">
      <MapPin className="h-3 w-3" strokeWidth={2.5} style={{ color: ACCENT_COLOR }} />
      {children}
    </span>
  );
}

function Chain({ nodes }: { nodes: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {nodes.map((n, i) => (
        <React.Fragment key={n}>
          <ChainNode>{n}</ChainNode>
          {i < nodes.length - 1 && (
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-600" strokeWidth={2} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function Block({ block }: { block: Block }) {
  switch (block.type) {
    case "p":
      return <p className="leading-7 text-slate-600 dark:text-slate-300">{block.text}</p>;
    case "label":
      return (
        <p className="mt-5 font-mono text-[11px] font-semibold uppercase tracking-wider" style={{ color: ACCENT_COLOR }}>
          {block.text}
        </p>
      );
    case "h3":
      return (
        <h3 className="mt-10 mb-3 scroll-mt-24 text-lg font-semibold text-slate-900 dark:text-white">
          {block.text}
        </h3>
      );
    case "ul":
      return (
        <ul className="space-y-2">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-3 leading-7 text-slate-600 dark:text-slate-300">
              <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ACCENT_COLOR }} />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="space-y-3">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-3">
              <Pin size="sm">{i + 1}</Pin>
              <span className="leading-7 text-slate-600 dark:text-slate-300">{it}</span>
            </li>
          ))}
        </ol>
      );
    case "table":
      return (
        <div className="overflow-hidden overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                {block.headers.map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-100/80 dark:border-slate-800/70 dark:hover:bg-slate-900/50"
                >
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={`px-4 py-2.5 align-top leading-6 ${j === 0
                        ? "font-medium text-slate-800 dark:text-slate-100"
                        : "text-slate-600 dark:text-slate-400"
                        }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "note":
      return (
        <div
          className="flex gap-3 rounded-lg border px-4 py-3.5"
          style={{
            borderColor: "color-mix(in srgb, var(--dash-accent, #111111) 30%, transparent)",
            backgroundColor: "color-mix(in srgb, var(--dash-accent, #111111) 10%, transparent)",
          }}
        >
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} style={{ color: ACCENT_COLOR }} />
          <p className="leading-6 text-sm" style={{ color: ACCENT_COLOR }}>
            {block.title && <span className="font-semibold">{block.title}: </span>}
            {block.text}
          </p>
        </div>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Module connection diagram (section 12 signature moment)            */
/* ------------------------------------------------------------------ */

function ConnectionDiagram() {
  const branches = [
    { root: "Clients", feeds: ["Contacts", "Sites", "Quotes / Invoices"] },
    { root: "Projects", feeds: ["Drawings", "Locations", "Jobs", "Quotes", "Forms"] },
    { root: "Pins", feeds: ["Pin forms / QA", "Job forms / QA"] },
    { root: "Materials", feeds: ["Dispatch", "Returns", "QR codes"] },
  ];
  return (
    <div className="space-y-8">
      <p className="leading-7 text-slate-600 dark:text-slate-300">
        The core delivery chain, root to leaf. Each node feeds the ones beneath it — Clients
        anchor Projects, Projects surface Pins, and Pins drive Materials and QR tracking.
      </p>
      <div className="rounded-xl border border-slate-200 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[length:20px_20px] p-6 dark:border-slate-800 dark:bg-slate-950/60 sm:p-8">
        <div className="space-y-6">
          {branches.map((b, idx) => (
            <div key={b.root}>
              <div className="flex flex-wrap items-center gap-2">
                <Pin>{idx + 1}</Pin>
                <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                  {b.root}
                </span>
              </div>
              <div className="mt-2 ml-3.5 flex flex-wrap gap-2 border-l-2 border-dashed border-slate-300 pl-6 dark:border-slate-700">
                {b.feeds.map((f) => (
                  <span
                    key={f}
                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider" style={{ color: ACCENT_COLOR }}>
            Vendor side
          </p>
          <Chain nodes={["Vendors", "Contacts", "Purchase Orders", "Items / Groups / Projects"]} />
        </div>
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider" style={{ color: ACCENT_COLOR }}>
            Catalog feeds
          </p>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            Groups / Items / Composites feed Pins, Quotes, POs, and Materials.
          </p>
        </div>
      </div>
      <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
        Settings configures statuses, types, forms, users, and Zoho sync across every branch
        above.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function SimHoDocs() {
  const [dark] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [active, setActive] = useState(SECTIONS[0].id);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const observer = useRef<IntersectionObserver | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: [0, 1] }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.current?.observe(el);
    });
    return () => observer.current?.disconnect();
  }, []);

  const searchResults = useMemo(() => buildSearchResults(searchQuery), [searchQuery]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileNavOpen(false);
  };

  const handleSearchSubmit = () => {
    if (searchResults[0]) {
      scrollTo(searchResults[0].sectionId);
      setActive(searchResults[0].sectionId);
      setSearchOpen(false);
    }
  };

  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearchOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchOpen]);

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
          .font-display { font-family: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif; }
          .font-mono { font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace; }
        `}</style>

        {searchOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center bg-white/40 px-4 py-20 backdrop-blur-md sm:px-6"
            onClick={() => setSearchOpen(false)}
          >
            <div
              className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-950/90"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSearchSubmit();
                  }}
                  placeholder="Search the guide…"
                  className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
                />
                <button
                  onClick={() => setSearchOpen(false)}
                  className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  aria-label="Close search"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 max-h-[60vh] overflow-y-auto">
                {!searchQuery.trim() ? (
                  <p className="py-4 text-sm text-slate-500 dark:text-slate-400">
                    Type to search the documentation and jump to the matching section.
                  </p>
                ) : searchResults.length === 0 ? (
                  <p className="py-4 text-sm text-slate-500 dark:text-slate-400">
                    No matching content found.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {searchResults.map((result) => (
                      <li key={`${result.sectionId}-${result.text}`}>
                        <button
                          onClick={() => {
                            scrollTo(result.sectionId);
                            setActive(result.sectionId);
                            setSearchOpen(false);
                          }}
                          className="w-full rounded-xl border border-slate-200 p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                        >
                          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {result.title}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
                            {highlightMatch(result.text, searchQuery)}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex max-w-[1400px]">
          {/* Sidebar */}
          <aside
            className={`${mobileNavOpen ? "block" : "hidden"
              } fixed inset-x-0 top-16 z-20 h-[calc(100vh-4rem)] w-full overflow-y-auto border-b border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-950 lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)] lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-6`}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                User guide
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchOpen(true);
                }}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
                aria-label="Open search"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
            <nav className="relative">
              <div className="absolute bottom-2 left-[13px] top-2 w-px border-l-2 border-dashed border-slate-200 dark:border-slate-800" />
              <ul className="space-y-0.5">
                {SECTIONS.map((s) => {
                  const Icon = s.icon;
                  const isActive = active === s.id;
                  return (
                    <li key={s.id} className="relative pl-8">
                      <span
                        className={`absolute left-0 top-1/2 flex h-[27px] w-[27px] -translate-y-1/2 items-center justify-center rounded-full border-2 font-mono text-[10px] font-bold transition-colors ${isActive
                          ? "text-white"
                          : "border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-600"
                          }`}
                        style={isActive ? { borderColor: ACCENT_COLOR, backgroundColor: ACCENT_COLOR } : undefined}
                      >
                        {s.num}
                      </span>
                      <button
                        onClick={() => scrollTo(s.id)}
                        className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${isActive
                          ? "font-medium"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
                          }`}
                        style={isActive ? { backgroundColor: "color-mix(in srgb, var(--dash-accent, #111111) 10%, transparent)", color: ACCENT_COLOR } : undefined}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                        <span className="truncate">{s.title}</span>
                        {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1 px-4 py-10 sm:px-8 lg:px-12 w-full flex flex-col items-center">
            {/* Hero */}
            <div className="mb-16 max-w-3xl">
              <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-wider" style={{ color: ACCENT_COLOR }}>
                Client teams · PMs · Field coordinators · Sales · Warehouse · Admins
              </p>
              <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                SimHo User Guide
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
                How to use SimHo module by module, how modules connect, and how common
                day-to-day workflows run end to end.
              </p>

              <div className="mt-8 rounded-xl border border-slate-200 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[length:20px_20px] p-5 dark:border-slate-800 dark:bg-slate-950/60 sm:p-6">
                <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  The core chain
                </p>
                <div className="space-y-3">
                  <Chain
                    nodes={[
                      "Client",
                      "Sites / Contacts",
                      "Project",
                      "Drawings",
                      "Pins",
                      "Jobs",
                      "Forms / QA",
                      "Quotes / Invoices",
                    ]}
                  />
                  <Chain nodes={["Vendor", "Contacts", "Purchase Orders", "Items / Groups"]} />
                  <Chain nodes={["Items / Composites", "Material Requests", "Dispatches", "Returns"]} />
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="max-w-3xl space-y-20">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <section key={s.id} id={s.id} className="scroll-mt-24">
                    <div className="mb-6 flex items-start gap-3 border-b border-slate-200 pb-5 dark:border-slate-800">
                      <Pin>{s.num}</Pin>
                      <div>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" strokeWidth={2} style={{ color: ACCENT_COLOR }} />
                          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {s.title}
                          </h2>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{s.dek}</p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {s.id === "module-connections" && <ConnectionDiagram />}
                      {s.blocks.map((b, i) => (
                        <Block key={i} block={b} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            <footer className="mx-auto mt-24 max-w-3xl border-t border-slate-200 py-8 text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
              Document version 1.0 · Based on the SimHo application modules and workflows
              available in the product.
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}