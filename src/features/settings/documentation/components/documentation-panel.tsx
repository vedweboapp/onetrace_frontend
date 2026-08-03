"use client";

import { Link } from "@/i18n/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MapPin,
  Search,
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
import { routes } from "@/shared/config/routes";

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
  anchorId: string;
};

const buildSearchResults = (query: string): SearchResult[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const results: SearchResult[] = [];
  const seen = new Set<string>();

  const tryAdd = (sectionId: string, title: string, text: string, anchorId: string) => {
    if (!text.toLowerCase().includes(normalizedQuery)) return;
    const key = `${sectionId}:${anchorId}:${text}`;
    if (seen.has(key)) return;
    seen.add(key);
    results.push({ sectionId, title, text, anchorId });
  };

  SECTIONS.forEach((section) => {
    const sectionBaseId = section.id;
    tryAdd(sectionBaseId, section.title, section.title, sectionBaseId);
    tryAdd(sectionBaseId, section.title, section.dek, sectionBaseId);

    section.blocks.forEach((block, blockIndex) => {
      const blockPrefix = `${sectionBaseId}-block-${blockIndex}`;
      switch (block.type) {
        case "p":
        case "label":
        case "h3":
        case "note":
          tryAdd(sectionBaseId, section.title, block.text, blockPrefix);
          break;
        case "ul":
        case "ol":
          block.items.forEach((item, itemIndex) => {
            tryAdd(sectionBaseId, section.title, item, `${blockPrefix}-item-${itemIndex}`);
          });
          break;
        case "table":
          block.headers.forEach((header, headerIndex) => {
            tryAdd(sectionBaseId, section.title, header, `${blockPrefix}-header-${headerIndex}`);
          });
          block.rows.forEach((row, rowIndex) => {
            row.forEach((cell, cellIndex) => {
              tryAdd(sectionBaseId, section.title, cell, `${blockPrefix}-row-${rowIndex}-cell-${cellIndex}`);
            });
          });
          break;
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
      h3("2.3 Sidebar navigation tips"),
      ul([
        "Quotes, Jobs, and Products open a small hover card on the right — Quotes → Service or Project, Jobs → Service or Project, Products → Items or Composite items.",
        "Choosing Service or Project keeps the correct category when you work in that list.",
        "Use the back arrow on detail pages to return to where you came from — for example, pin detail returns to the project Locations tab when opened from there.",
        "Language and appearance: Settings → Personal Profile.",
      ]),
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
      h3("List tools"),
      table(
        ["Tool", "Typical use"],
        [
          ["Search", "Find by name, code, or ID"],
          ["Filters", "Status, client, worker, active/inactive, and more"],
          ["Card / Table", "Switch layout"],
          ["Add / Create", "Open the create form"],
          ["Row actions", "Edit, delete, activate/deactivate, update status"],
          ["Mass actions", "Select rows → update, delete, or export"],
        ]
      ),
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
      p("Purpose — master record for each customer organisation. Almost every commercial and project flow starts here."),
      label("List page"),
      ul([
        "Search, Active / Inactive filter, Card / Table view",
        "Add client",
        "Mass update, mass delete, mass export",
        "Mass-update examples: name, email, phone, address fields, active",
      ]),
      label("Create / Edit — important fields"),
      table(
        ["Field", "Why it matters"],
        [
          ["Client name", "Required identity of the customer"],
          ["Email / Phone", "Primary communication"],
          ["Addresses", "Billing, Shipping, Other — line 1/2, country, state, city, postal"],
          ["Primary address", "Marks the main address used by default"],
        ]
      ),
      label("Detail tabs"),
      table(
        ["Tab", "What you do"],
        [
          ["Overview", "Core client info and addresses"],
          ["Contacts", "People for this client (+ Add contact)"],
          ["Sites", "Locations for this client (+ Add site)"],
        ]
      ),
      label("Connected to"),
      p("Contacts, Sites, Projects, Quotes, Invoices, Jobs."),
      label("Tips"),
      ul([
        "Create the client before contacts, sites, projects, or quotes.",
        "Prefer deactivate over delete when the client has history.",
        "Add at least one usable address.",
      ]),

      h3("5.2 Vendors"),
      p("Purpose — suppliers you buy from. Required for purchase orders and vendor contacts."),
      label("List page"),
      ul([
        "Search, Active / Inactive, Card / Table, Add",
        "Row actions: edit, activate/deactivate, delete",
        "No shared mass-action bar on this list",
      ]),
      label("Create / Edit — important fields"),
      table(
        ["Field", "Why it matters"],
        [
          ["Vendor name", "Required"],
          ["Email / Phone", "Communication"],
          ["Vendor type", "Classification from Settings → Customization"],
          ["Addresses", "Same pattern as clients"],
        ]
      ),
      label("Detail tabs"),
      table(
        ["Tab", "What you do"],
        [
          ["Details", "Overview and locations"],
          ["Contacts", "Vendor contacts"],
        ]
      ),
      label("Connected to"),
      p("Vendor Contacts → Purchase Orders → Items / Groups. Vendor types come from Settings."),
      label("Tips"),
      ul([
        "Configure vendor types in Settings first.",
        "Create the vendor before vendor contacts or POs.",
      ]),

      h3("5.3 Contacts"),
      p("Purpose — people linked to a client or a vendor."),
      label("List page"),
      ul([
        "Tabs: Client / Vendor",
        "Search, Active filter, Client or Vendor filter, Card / Table",
        "Add, mass update / delete / export",
      ]),
      label("Create / Edit — important fields"),
      table(
        ["Field", "Why it matters"],
        [
          ["Name", "Required"],
          ["Contact type", "Client contact or Vendor contact"],
          ["Client or Vendor", "Parent organisation (required)"],
          ["Email / Phone", "Contact details"],
          ["Address", "Optional location for the person"],
        ]
      ),
      label("Detail page"),
      p("Single overview (no multi-tabs): contact details, address, record metadata."),
      label("Connected to"),
      p("Quotes (primary / additional / site contact), Invoices, Purchase orders, Site contact persons."),
      label("Tips"),
      ul([
        "Need at least one client (or vendor) before creating a contact.",
        "Prefer creating contacts from the parent Client or Vendor detail page so the link stays correct.",
      ]),

      h3("5.4 Sites"),
      p("Purpose — physical locations belonging to a client, with address and map. Used by projects, quotes, and jobs."),
      label("List page"),
      ul([
        "Search, Active filter, Client filter, Card / Table",
        "Add, mass update / delete / export",
      ]),
      label("Create / Edit — important fields"),
      table(
        ["Field", "Why it matters"],
        [
          ["Site name", "Required label for the location"],
          ["Client", "Owner of the site"],
          ["Address + map", "Search / pin on map; stores lat / lng"],
          ["What3words", "Optional precise location helper"],
          ["Contact persons", "Titles such as Site contact, Finance, Emergency + linked contact"],
        ]
      ),
      label("Detail page"),
      p("Overview with address, map, and record info."),
      label("Connected to"),
      p("Projects, Quotes, Jobs. Always belongs to a Client. Create the client first, then the site(s)."),
      label("Tips"),
      ul([
        "Create the client first.",
        "Use the map pin (click or drag) so coordinates are correct.",
        "Do not duplicate the same title + contact pair on one site.",
      ]),

      h3("5.5 Projects — the central hub"),
      p("Purpose — the main delivery container for drawings, pins, jobs, forms, and project quotes."),
      label("List page"),
      ul([
        "Search, Active filter, Card / Table, Add",
        "Mass update / delete / export",
        "Mass-update examples: name, client, project type, description, start/end, active",
      ]),
      label("Detail header actions"),
      ul([
        "Update Status",
        "Quote — starts a project quote from this project",
        "Edit / Delete",
      ]),
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
      label("Connected to"),
      p("Client, Sites, Project types/statuses, Forms, Drawings/Pins, Jobs, Quotes, Composites."),
      label("Tips"),
      ul([
        "Need client + at least one project type before creating a project.",
        "Place plots before pins.",
        "Complete enough pins before creating an accurate project quote.",
        "Job Sheets / Docs / Approvals tabs are not ready yet.",
      ]),

      h3("5.6 Quotes"),
      p("Purpose — commercial proposals. Use the sidebar hover card: Service (lighter client/site focused quote) or Project (scoped from project drawings / pins / composites)."),
      label("List page"),
      ul([
        "Search; filters for client, site, project (project quotes), quote status, category",
        "Card / Table, Add",
        "Mass update / delete / export",
        "Row action: Update status",
        "Statuses: Draft · Sent · Approved · Rejected",
      ]),
      label("Create / Edit — important fields"),
      table(
        ["Field", "Why it matters"],
        [
          ["Quote name", "Label for the proposal"],
          ["Client", "Who the quote is for"],
          ["Site(s)", "Where work applies"],
          ["Project", "Required for project quotes"],
          ["Contacts", "Primary / additional / site contacts"],
          ["Order number / Due date", "Commercial tracking"],
          ["Salesperson / Project manager / Technicians", "Assignees"],
          ["Tags / Description", "Classification and notes"],
        ]
      ),
      label("Form structure"),
      ul([
        "Project & details (or Details for service)",
        "Scope & pricing — Service: build sections / plots / composites more freely; Project: include project levels/plots/pins, pricing from composites on pins",
      ]),
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
      label("Connected to"),
      p("Client, Site, Project, Contacts, Tags, Composites, Users. Also created from project header Quote. Shown on project Quotes tab."),
      label("Tips"),
      ul([
        "Project quotes need a project with pins already placed for accurate scope.",
        "Keep Service vs Project category correct via the sidebar flyout.",
        "Export from the quote detail page.",
      ]),

      h3("5.7 Invoices"),
      p("Purpose — bill clients for completed or agreed work."),
      label("List page"),
      ul([
        "Search; Status; Client; Card / Table",
        "Create Invoice",
        "Mass update / delete / export",
        "Statuses: Draft · Sent · Paid · Pending · Overdue",
      ]),
      label("Create / Edit — important fields"),
      table(
        ["Field", "Why it matters"],
        [
          ["Client", "Who is billed"],
          ["Contact", "Invoice recipient"],
          ["Invoice number", "Document identity"],
          ["Project", "Optional project link"],
          ["Issue / Due dates", "Billing schedule"],
          ["Payment terms", "Net 7/15/30/45 or Due on receipt"],
          ["Bill to / Ship to", "Addresses"],
          ["Notes", "Client-facing and internal"],
          ["Line items", "Group → product, qty, rate, discount, tax"],
        ]
      ),
      label("Detail tabs"),
      table(
        ["Tab", "What you do"],
        [
          ["Overview", "Header and totals"],
          ["Line items", "Product lines"],
        ]
      ),
      p("Actions: Preview, Download PDF, Send, Export."),
      label("Connected to"),
      p("Client, Contact, Project, Groups/Items. Can sync via Zoho (invoices resource)."),
      label("Tips"),
      ul([
        "Add clear line items with quantities and rates.",
        "Validate bill-to / ship-to addresses before sending.",
      ]),

      h3("5.8 Purchase orders"),
      p("Purpose — order goods from vendors for projects or catalog items."),
      label("List page"),
      ul([
        "Search; Status; Vendor; Card / Table",
        "Create purchase order",
        "Statuses: Draft · Sent · Approved · Received · Cancelled",
        "No shared mass-action bar",
      ]),
      label("Create / Edit — important fields"),
      table(
        ["Field", "Why it matters"],
        [
          ["Vendor", "Who you buy from"],
          ["Contact", "Vendor contact"],
          ["PO number", "Document identity"],
          ["Project", "Optional link"],
          ["Issue / Due dates", "Schedule"],
          ["Payment terms", "Commercial terms"],
          ["Addresses", "Billing / shipping / other"],
          ["Notes", "Vendor and internal notes"],
          ["Line items", "Group → product, quantity, unit price (amount = unit price × qty)"],
        ]
      ),
      label("Detail tabs"),
      table(
        ["Tab", "What you do"],
        [
          ["Overview", "Header and totals"],
          ["Line items", "Ordered products"],
        ]
      ),
      label("Connected to"),
      p("Vendor → Contacts → PO → Items / Groups / Projects. Zoho can sync purchase orders."),
      label("Tips"),
      ul([
        "Vendor and at least one address are required.",
        "Each line needs a product.",
      ]),

      h3("5.9 Jobs"),
      p("Purpose — field work units assigned to operatives, split into Service and Project jobs in the sidebar."),
      label("List page"),
      ul([
        "Search; Job status; Assigned worker; Category; Active",
        "Card / Table, Add",
        "Mass update / delete / export and Assign worker",
        "Mass-update fields include title, description, client, project, site, job status, start date (Form is not available in job mass update)",
      ]),
      label("Create / Edit — important fields"),
      table(
        ["Field", "Why it matters"],
        [
          ["Title / Description", "What the job is"],
          ["Client / Project / Site", "Context"],
          ["Assigned worker", "Who does the work"],
          ["Start / End", "Schedule"],
          ["Job status", "Workflow state"],
          ["Forms / Checklists", "Field capture requirements"],
          ["Work scope (project jobs)", "Levels / plots / composites / pins"],
        ]
      ),
      label("Create jobs"),
      ul([
        "Jobs → Add (service or project category), or",
        "Project → Locations → Create Job from selected pins (preferred for project work so pins stay linked).",
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
      label("Connected to"),
      p("Client, Project, Site, Forms, Checklists, QR, Composites, Material Requests, Dispatches, Returns, Pin detail."),
      label("Tips"),
      ul([
        "Use the correct Service / Project flyout category.",
        "Complete checklists before form fill if a checklist gate is enabled.",
        "Assign a worker so material-request job pickers work correctly.",
      ]),

      h3("5.10 QR codes"),
      p("Purpose — generate batches of QR codes, assign them to jobs, and track scans."),
      label("List page"),
      ul([
        "Search by QR ID; Status (Assigned / Not assigned)",
        "Card / Table",
        "Generate QR codes (not a simple Add)",
        "Mass update / delete / export",
      ]),
      label("Generate flow"),
      ol([
        "Enter how many codes to create.",
        "System creates a batch (batch number shown on list/detail).",
        "Optionally download CSV.",
        "Assign codes to a job.",
        "Track scan count and last scanned.",
      ]),
      label("Detail page"),
      p("QR image, assignment info, scan activity, link to job when assigned."),
      label("Connected to"),
      p("Jobs (job detail can show QR section)."),
      label("Tips"),
      ul([
        "Filter Not assigned to find free codes.",
        "Generate in batches sized for your field process.",
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
      label("Groups"),
      ul([
        "List page — search, Card / Table, Add group, mass update / delete / export.",
        "Create / Edit fields — Group name (bucket label), Composite rows (linked composites + abbreviation).",
        "Detail page — overview and linked composites (qty / cost / sell where shown).",
        "Connected to — Composite items; used in the drawing editor and quoting.",
        "Tips — create groups before composites; abbreviations matter on drawings.",
      ]),
      label("Items"),
      ul([
        "List page — search, Card / Table, Add, mass update / delete / export; row action Make composite (use carefully).",
        "Create / Edit fields — Name / SKU (identity), Quantity / Unit (stock measure, unit types from Settings), Cost / Sell (commercial values), Dimensions / Weight (logistics), Attachments (specs / images).",
        "Connected to — Composite components; Invoice / PO / Material lines; Zoho items sync.",
        "Tips — keep SKUs unique and clean; use unit types from Settings for consistency.",
      ]),
      label("Composite items"),
      ul([
        "List page — search, Group filter, Card / Table, Add, mass update / delete / export (including move to group).",
        "Create / Edit fields — Name / SKU (identity), Group (required catalog bucket), Installation type (drives which forms appear for pins), Unit / Qty (measure), Cost / Sell / Installation cost (pricing, fixed or rate × hours), Components (item + quantity rows), Attachments (guidance documents shown on pins/jobs).",
        "Connected to — Pins, Quotes, Jobs, Groups, POs. Installation type must align with project forms.",
        "Tips — create the group first; if the drawing editor says no form matches the installation type, fix Settings / Project forms / Installation type mapping.",
      ]),
      p("Keep catalog data clean before placing pins or building quotes — pin product names and quote lines come from here."),

      h3("5.12 Material Requests → Dispatches → Returns"),
      p("Purpose — move materials from warehouse to field and back."),
      label("Material Requests"),
      ul([
        "Purpose — request materials for a worker's jobs; first step of warehouse fulfilment.",
        "List page — search; Status; Worker; Requested date; Card / Table; Create material request; mass update / delete / export.",
        "Statuses — Draft · Pending · Partially dispatched · Dispatched.",
        "Create fields — Worker (whose jobs to pull from), Requested date (when materials are needed), Notes (warehouse guidance), Jobs (active jobs for that worker), Lines (derived from job work scope, quantities calculated by the system).",
        "Detail page — Overview (request header and lines), Activity timeline (history of changes), Dispatch button (opens dispatch screen, not a tab).",
        "Tips — worker must have assigned jobs with composite/work scope; empty job scope means no request lines; after save, use Dispatch from the detail page.",
      ]),
      label("Dispatches"),
      ul([
        "Purpose — fulfilment records created from material requests (not created as a blank standalone form from the list).",
        "List page — search; Card / Table; empty state points you to Material Requests; no shared mass-action bar.",
        "How to dispatch — open a Material Request, click Dispatch, enter dispatch quantity per line (can exceed request → surplus), add extra items if needed, add notes, confirm.",
        "Detail page — overview, material lines (requested / dispatched / pending / extra), restock history, line detail.",
        "Tips — always start from a Material Request; surplus and extras are what Returns usually target.",
      ]),
      label("Returns"),
      ul([
        "Purpose — return unused, surplus, or faulty materials to stock.",
        "List page — search; Status (Pending / Completed / Rejected); Worker; Date presets; Card / Table; New return request; mass actions: Return to stock (pending) + export.",
        "Create flow — choose worker and filters (date / MR), load returnable lines (extra and surplus), set reason and return type (Unused / Faulty), submit.",
        "Detail page — overview + return items; complete the return to put stock back. You can also restock unused dispatched quantity from dispatch / MR restock actions where available.",
      ]),
      label("Recommended sequence"),
      ol([
        "Material Request — create a request for the job / materials needed; track status using Material Statuses from Settings; open detail → Overview / Dispatch / Timeline.",
        "Dispatch — from the request, dispatch quantities per line; review records under Dispatches.",
        "Returns — return unused materials to stock via Returns, or return actions on a dispatch; job detail also mirrors Materials / Dispatch / Returns for field visibility.",
      ]),
      label("Connected to"),
      p("Jobs → Material Request → Dispatches → Returns. Statuses from Material Statuses in Settings."),
    ],
  },
  {
    id: "workflows",
    num: "06",
    title: "End-to-end workflows",
    icon: Workflow,
    dek: "Six real sequences, start to finish.",
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
      h3("Workflow E — Materials in / out"),
      ol([
        "Job has work scope + assigned worker.",
        "Create a Material Request for that worker's jobs.",
        "Dispatch quantities (and extras if needed).",
        "Return surplus / extra / faulty stock and complete to inventory.",
      ]),
      h3("Workflow F — QR tracking on a job"),
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
          ["Users", "Invite users — name, email, phone, gender, role, address"],
          ["Documentation", "In-app documentation"],
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
          ["Tags", "Labelling quotes, pins, and related records"],
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
      h3("8.4 Third Party App Integrations — Zoho Inventory"),
      p("Connect your Zoho Inventory account with SimHo to automatically bring your business records into SimHo."),
      label("What can sync from Zoho Inventory"),
      ul([
        "Items and composite items",
        "Customers and contacts",
        "Vendors and contacts",
        "Purchase orders",
        "Invoices",
      ]),
      label("How to connect Zoho Inventory"),
      ol([
        "Go to Settings → Integrations → Zoho Inventory → click Connect.",
        "Sign in to your Zoho account and allow SimHo to access your Zoho Inventory data.",
        "After connecting, open the Configuration tab.",
        "Select a module, such as Items, Customers, or Vendors, and map the Zoho fields to the corresponding SimHo fields — for example, Zoho Item Name → SimHo Item Name.",
        "Click Save Mapping. You must save the required field mappings before records from that module can be synced.",
        "Click Pull Historical Data for the respective module to import your existing Zoho Inventory records into SimHo.",
        "The Webhooks tab provides details to set up a webhook in your Zoho Inventory platform, so new or updated records in Zoho Inventory are automatically synced with SimHo.",
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

function Block({ block, id, highlightQuery }: { block: Block; id?: string; highlightQuery?: string }) {
  switch (block.type) {
    case "p":
      return (
        <p id={id} className="leading-7 text-slate-600 dark:text-slate-300">
          {highlightMatch(block.text, highlightQuery ?? "")}
        </p>
      );
    case "label":
      return (
        <p
          id={id}
          className="mt-5 font-mono text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: ACCENT_COLOR }}
        >
          {highlightMatch(block.text, highlightQuery ?? "")}
        </p>
      );
    case "h3":
      return (
        <h3 id={id} className="mt-10 mb-3 scroll-mt-24 text-lg font-semibold text-slate-900 dark:text-white">
          {highlightMatch(block.text, highlightQuery ?? "")}
        </h3>
      );
    case "ul":
      return (
        <ul className="space-y-2">
          {block.items.map((it, i) => (
            <li
              id={id ? `${id}-item-${i}` : undefined}
              key={i}
              className="flex gap-3 leading-7 text-slate-600 dark:text-slate-300"
            >
              <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ACCENT_COLOR }} />
              <span>{highlightMatch(it, highlightQuery ?? "")}</span>
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
              <span
                id={id ? `${id}-item-${i}` : undefined}
                className="leading-7 text-slate-600 dark:text-slate-300"
              >
                {highlightMatch(it, highlightQuery ?? "")}
              </span>
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
                {block.headers.map((h, j) => (
                  <th
                    id={id ? `${id}-header-${j}` : undefined}
                    key={h}
                    className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    {highlightMatch(h, highlightQuery ?? "")}
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
                      id={id ? `${id}-row-${i}-cell-${j}` : undefined}
                      key={j}
                      className={`px-4 py-2.5 align-top leading-6 ${j === 0
                        ? "font-medium text-slate-800 dark:text-slate-100"
                        : "text-slate-600 dark:text-slate-400"
                        }`}
                    >
                      {highlightMatch(cell, highlightQuery ?? "")}
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
          id={id}
          className="flex gap-3 rounded-lg border px-4 py-3.5"
          style={{
            borderColor: "color-mix(in srgb, var(--dash-accent, #111111) 30%, transparent)",
            backgroundColor: "color-mix(in srgb, var(--dash-accent, #111111) 10%, transparent)",
          }}
        >
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} style={{ color: ACCENT_COLOR }} />
          <p className="leading-6 text-sm" style={{ color: ACCENT_COLOR }}>
            {block.title && <span className="font-semibold">{block.title}: </span>}
            {highlightMatch(block.text, highlightQuery ?? "")}
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
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setMobileNavOpen(false);
  };

  const handleSearchSubmit = () => {
    if (searchResults[0]) {
      scrollTo(searchResults[0].anchorId);
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
                            scrollTo(result.anchorId);
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

        <div className="flex w-full">
          {/* Sidebar */}
          <aside
            className={`${mobileNavOpen ? "block" : "hidden"
              } fixed inset-x-0 top-16 z-20 h-[calc(100vh-4rem)] w-full overflow-y-auto border-b border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-950 lg:sticky lg:top-2 lg:block lg:h-[calc(100vh-2rem)] lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-6`}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                User guide
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 lg:hidden"
                  aria-label="Close contents"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  type="button"
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
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-wider" style={{ color: ACCENT_COLOR }}>
                    Client teams · PMs · Field coordinators · Sales · Warehouse · Admins
                  </p>
                  <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                    SimHo User Guide
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900 lg:hidden"
                  >
                    <ListChecks className="h-4 w-4" />
                    Contents
                  </button>
                  <Link
                    href={routes.dashboard.root}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                  >
                    <X className="h-4 w-4" aria-hidden />
                    Close
                  </Link>
                </div>
              </div>
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
                          {highlightMatch(s.title, searchQuery)}
                        </h2>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{highlightMatch(s.dek, searchQuery)}</p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {s.id === "module-connections" && <ConnectionDiagram />}
                      {s.blocks.map((b, i) => (
                        <Block key={i} id={`${s.id}-block-${i}`} block={b} highlightQuery={searchQuery} />
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