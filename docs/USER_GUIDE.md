# SimHo User Guide

**Audience:** Client teams, project managers, field coordinators, sales, warehouse, and administrators  
**Purpose:** Explain how to use SimHo module by module, how modules connect, and how common day-to-day workflows run end to end.

---

## 1. What SimHo is

SimHo is a project and field-operations platform. It helps your team:

- Manage **clients**, **sites**, and **contacts**
- Plan and deliver **projects** with floor drawings and **location pins**
- Create **service** and **project jobs**, fill **forms**, and run **quality assurance**
- Prepare **quotes**, **invoices**, and **purchase orders**
- Request, dispatch, and return **materials**
- Track products (**items**, **composite items**, **groups**) and **QR codes**
- Configure statuses, types, forms, users, and integrations under **Settings**

Think of the system as a chain:

```text
Client → Sites / Contacts
       → Project → Drawings → Pins (Locations) → Jobs → Forms / QA
       → Quotes / Invoices

Vendor → Contacts → Purchase Orders → Items / Groups

Items / Composites → Material Requests → Dispatches → Returns

Jobs ← QR Codes
```

---

## 2. Getting started

### 2.1 Sign in

1. Open the SimHo login page.
2. Enter your email and password.
3. Use **Forgot password** if you need a reset.

Your administrator creates users under **Settings → Users** and assigns a role (for example technician, manager, or sales). Roles mainly control who appears in assignment pickers (workers, quote assignees, and similar).

### 2.2 Main layout

| Area | What it does |
|------|----------------|
| **Left sidebar** | Jump between modules (Clients, Projects, Jobs, and so on) |
| **Top bar** | Settings and your profile |
| **Main area** | Lists, detail pages, and forms for the module you selected |

**Tips**

- Many lists support **search**, **filters**, and **pagination**.
- Use the **back arrow** on detail pages to return to the previous screen (for example, pin details return to the project **Locations** tab when opened from there).
- Language and appearance can be adjusted under **Settings → Personal Profile**.

---

## 3. Navigation map (sidebar)

### Core CRM

| Menu | Use it for |
|------|------------|
| **Clients** | Customer organisations |
| **Vendors** | Suppliers |
| **Contacts** | People linked to clients or vendors |
| **Sites** | Physical locations under a client |

### Commercial

| Menu | Use it for |
|------|------------|
| **Quotes → Service Quote** | Lighter service proposals |
| **Quotes → Project Quote** | Project-scoped proposals (levels, pins, composites) |
| **Invoices** | Client billing |
| **Purchase orders** | Buying from vendors |

### Delivery & field

| Menu | Use it for |
|------|------------|
| **Jobs → Service** | Service jobs |
| **Jobs → Project** | Project jobs |
| **QR codes** | Generate batches and assign codes to jobs |
| **Projects** | Central delivery hub (drawings, locations, jobs, forms) |

### Catalog & logistics

| Menu | Use it for |
|------|------------|
| **Groups** | Catalog grouping |
| **Products → Items** | Stock / SKU-style products |
| **Products → Composite items** | Grouped catalogue lines used on drawings, quotes, and POs |
| **Material Requests** | Request materials for jobs |
| **Dispatches** | Fulfil material requests |
| **Returns** | Return unused stock to inventory |

### Settings

Open the gear icon to manage workspace configuration (statuses, types, forms, users, Zoho, and more).

---

## 4. Common screen patterns

Most modules follow the same pattern so teams learn once and reuse everywhere.

### 4.1 List → Detail → Create / Edit

1. **List** — browse, search, filter, select rows.
2. **Detail** — read-only overview; often with tabs.
3. **New / Edit** — create or update a record, then save.

### 4.2 Mass actions

On many lists you can:

1. Select one or more rows (or select all).
2. Use the mass-action bar to **update**, **delete**, or **export**.
3. Choose a field to update (for example status or site), set the value, and apply.

**Note for jobs:** Job mass update does **not** include a form field. Forms are managed on the job or pin, not via job mass update.

### 4.3 Detail tabs

Rich records use tabs. Examples:

- **Project:** Overview, Forms, Drawings, Jobs, Locations, Quotes, Job Sheets, Docs, Approvals  
- **Job:** Overview, Materials, Dispatch, Returns  
- **Client:** Overview, Contacts, Sites  
- **Material request:** Overview, Dispatch, Timeline  

### 4.4 Quick create from related screens

While filling a form (for example creating a project), you can often create a related record (client, site, contact) and return to the original form with the new value selected.

---

## 5. Module guide

### 5.1 Clients

**Purpose:** Master record for each customer organisation.

**Typical flow**

1. Create a client (name, contact details, address).
2. Add **contacts** and **sites** from the client detail tabs (or from their own modules).
3. Use the client on projects, quotes, invoices, and jobs.

**Detail tabs:** Overview · Contacts · Sites  

**Also useful:** Activate / deactivate, mass update, export.

---

### 5.2 Vendors

**Purpose:** Suppliers you buy from.

**Typical flow**

1. Create a vendor (optionally with a **vendor type** from Settings).
2. Add vendor **contacts**.
3. Create **purchase orders** against the vendor.

**Detail tabs:** Details · Contacts  

---

### 5.3 Contacts

**Purpose:** People linked to clients or vendors.

**How to use**

- Open **Contacts** and switch between **Client** and **Vendor** contact views.
- Assign contacts when creating quotes, POs, or client/vendor records.
- Prefer creating contacts under the parent client/vendor so relationships stay correct.

---

### 5.4 Sites

**Purpose:** Physical locations belonging to a client (address and map).

**Why it matters**

Sites connect clients to **projects**, **quotes**, and **jobs**. Create the client first, then the site(s).

---

### 5.5 Projects (central hub)

**Purpose:** The main delivery container for drawings, pins, jobs, forms, and project quotes.

**Create a project**

1. Go to **Projects → New**.
2. Select **client**, **site(s)**, **project type**, **status**, and other required fields.
3. Save, then open the project detail page.

**Detail tabs and what to do in each**

| Tab | What you do |
|-----|-------------|
| **Overview** | Core project info |
| **Forms** | Project / job form assignments |
| **Drawings** | Upload floor plans / blueprints and open the drawing editor |
| **Jobs** | View and manage jobs created for this project (mass actions available) |
| **Locations** | Browse pins by drawing/level; open pin details; create jobs from locations |
| **Quotes** | Project-related quotes |
| **Job Sheets / Docs / Approvals** | Supporting project documents and approval views |

**Drawing editor**

1. Open a drawing from the **Drawings** tab.
2. Place **pins** on the plan (product / composite, quantity, status, tags, forms as needed).
3. Save pin changes.

**Locations tab**

1. Filter by level, plot, status, or other criteria.
2. Click a pin to open the **pin detail** page (form on one side, pin details on the other).
3. Create jobs from selected locations when ready for field work.
4. Use mass update on pins for status, quantity, variation, and similar fields.

**Pin detail page**

- Left: **Assigned form** (fill or view submission). Long forms scroll independently.
- Right: Pin details (product, attachments, quantity, status, coordinates, QA when decided).
- Form **images** also appear at the bottom of the pin details column for quick review.
- Back arrow returns to the project **Locations** tab when you opened the pin from there.

---

### 5.6 Quotes

**Purpose:** Commercial proposals.

**Two quote types**

| Type | Best for |
|------|----------|
| **Service Quote** | Service-oriented work (client / site focused) |
| **Project Quote** | Project scope with levels, pins, and composite items |

**Typical flow**

1. Create a quote from **Quotes** or from a project (**Quote project**).
2. Select client, site, project (as needed), line items / composites, and assignees.
3. Update status, export (PDF / Excel / CSV), or send as your process requires.
4. Review public pin preview when sharing scoped pin content.

---

### 5.7 Invoices

**Purpose:** Bill clients.

**Typical flow**

1. Create an invoice linked to the client (and project context when used).
2. Add **line items** on the Line items tab.
3. Preview, download PDF, or send.
4. Use list mass update / export when processing many invoices.

---

### 5.8 Purchase orders

**Purpose:** Order goods from vendors for projects / catalog items.

**Typical flow**

1. Create a PO with **vendor**, optional **project**, and line items (**items** / **groups**).
2. Enter unit price and quantity; amount is calculated from those values.
3. Review Overview and Line items tabs; track status through your purchasing process.

---

### 5.9 Jobs

**Purpose:** Units of field work. Split into **Service** and **Project** jobs in the sidebar.

**Create jobs**

- From **Jobs → New**, or  
- From a **project Locations** tab (create job from selected pins / locations).

**On the job detail page**

| Area | What you do |
|------|-------------|
| **Overview** | Status, workers, dates, related client / site / project |
| **Forms / checklists** | Fill assigned forms |
| **Drawings & pins** | Open pin detail under the job when pins are linked |
| **Materials / Dispatch / Returns** | Request and track materials for this job |
| **Quality assurance** | Approve or reject QA when shown |
| **QR codes** | Assign or view codes linked to the job |

**Mass update on jobs**

You can mass-update fields such as title, description, client, project, site, status, and start date. The **form** field is not part of job mass update—assign and complete forms on the job or pin instead.

---

### 5.10 QR codes

**Purpose:** Generate batches of QR codes, assign them to jobs, and track scans.

**Typical flow**

1. Generate a batch (quantity and batch number).
2. Assign codes to a job.
3. Monitor scan count / last scanned on the list or job.

---

### 5.11 Groups, Items, Composite items

**Purpose:** Product catalog used across drawings, quotes, POs, and material flows.

| Module | Role |
|--------|------|
| **Groups** | Named buckets for organising composites |
| **Items** | Individual products / SKUs (with unit types) |
| **Composite items** | Bundled catalogue lines placed on drawings and quotes |

Keep catalog data clean before placing pins or building quotes—pin product names and quote lines come from here.

---

### 5.12 Material Requests → Dispatches → Returns

**Purpose:** Move materials from warehouse to field and back.

**Recommended sequence**

1. **Material Request**  
   - Create a request for the job / materials needed.  
   - Track status using **Material Statuses** from Settings.  
   - Open detail → Overview / Dispatch / Timeline.

2. **Dispatch**  
   - From the request, dispatch quantities per line.  
   - Review records under **Dispatches**.

3. **Returns**  
   - Return unused materials to stock via **Returns** (or return actions on a dispatch).  
   - Job detail also mirrors Materials / Dispatch / Returns for field visibility.

```text
Job needs materials
        ↓
 Material Request  →  Dispatch (send out)  →  Returns (bring back)
```

---

## 6. End-to-end workflows

### Workflow A — New client project to field completion

1. **Settings** — Confirm project types, pin statuses, job statuses, checklist types, and forms exist.
2. **Clients** — Create client → add contacts → add sites.
3. **Projects** — Create project linked to client and site(s).
4. **Catalog** — Ensure items / composite items / groups are ready.
5. **Drawings** — Upload drawings; place pins (product, qty, status, form).
6. **Locations** — Review pins; open pin details to verify forms/images.
7. **Jobs** — Create project jobs from locations; assign technicians and dates.
8. **Forms** — Technicians fill forms on job / pin detail.
9. **QA** — Approve or reject quality assurance on the job / pin.
10. **Materials** (if needed) — Material request → dispatch → return leftovers.
11. **Close** — Update job and project statuses when work is complete.

### Workflow B — Quote a project

1. Complete enough project scope (drawings / pins / composites) for accurate pricing.
2. From the project, start a **Project Quote** (or create under Quotes → Project Quote).
3. Select client, site, project, and scoped lines.
4. Export / send; track status on the Quotes list and project Quotes tab.

### Workflow C — Service work without a full project build

1. Create **Client** and **Site**.
2. Create a **Service Quote** if commercial approval is needed.
3. Create a **Service Job**.
4. Assign workers, fill forms, update status, optionally use materials and QR codes.

### Workflow D — Buy materials from a vendor

1. Create **Vendor** (+ vendor type) and contacts.
2. Ensure **Items / Groups** exist.
3. Create a **Purchase Order** with vendor, project (optional), and line items.
4. Track fulfilment outside or alongside material request / dispatch processes as your team defines.

### Workflow E — QR tracking on a job

1. Generate a QR **batch**.
2. Assign codes to the target job.
3. Use scan activity for field tracking and audit.

---

## 7. Quality assurance (QA)

QA appears on job and pin contexts when quality review is required.

**How it works**

1. While QA is not decided, use **Yes** (approve) or **No** (reject).
2. Rejection typically requires **remarks**.
3. After a decision, the record shows status (for example Approved / Rejected), who decided, and when.
4. On pin detail, decided QA appears in the pin details column.

Use QA as the formal gate between field completion and sign-off.

---

## 8. Settings (administrators)

Configure the workspace before heavy operational use. Path: **Settings**.

### 8.1 People & company

| Setting | Purpose |
|---------|---------|
| **Personal Profile** | Your profile, language, appearance |
| **Company Settings** | Organisation-level details |
| **Users** | Create users and assign roles |

### 8.2 Customization (statuses & types)

| Setting | Affects |
|---------|---------|
| **Project Types** | Project classification; linked to forms / checklists |
| **Installation Types** | Installation classification |
| **Vendor Types** | Vendor classification |
| **Unit Types** | Units for catalog items |
| **Checklist Types** | Checklists used on jobs |
| **Project / Pin / Job / Material Statuses** | Workflow labels and colours |
| **Tags** | Labelling pins and related records |
| **Titles** | Title options used on projects / related forms |

### 8.3 Forms & modules

| Setting | Purpose |
|---------|---------|
| **Modules** | Custom modules and layouts (form builder) |
| **Project forms** | Forms associated with project types / job use |

Design forms here; assign them to pins / jobs in project and job flows.

### 8.4 Integrations (Zoho Inventory)

Connect Zoho Inventory to sync resources such as items, customers/contacts, vendors, and purchase orders.

**High-level steps**

1. Open **Settings → Integrations**.
2. Connect / authorise Zoho.
3. Map Zoho fields to SimHo fields (**key mapping**). Mapping must be saved before sync is useful.
4. Optionally pull historical records.
5. Configure webhooks as required so new Zoho changes continue to sync.

---

## 9. Recommended setup order (new workspace)

Use this checklist when onboarding a client team:

1. Company settings and users / roles  
2. Customization: types, statuses, tags, titles, unit types, checklist types  
3. Forms and project-form assignments  
4. Catalog: groups → items → composite items  
5. Clients → contacts → sites  
6. Vendors → vendor contacts (if purchasing)  
7. First project → drawings → pins  
8. Quote / job processes  
9. Material request → dispatch → return (if warehouse is in scope)  
10. QR batches (if tracking is in scope)  
11. Zoho integration (if required)

---

## 10. Roles on the team (practical guide)

| Role focus | Typical modules |
|------------|-----------------|
| **Sales / account** | Clients, Contacts, Sites, Quotes, Invoices |
| **Project manager** | Projects, Drawings, Locations, Jobs, Quotes, QA |
| **Technician / field** | Jobs, Forms, Pin detail, Materials on job, QR |
| **Warehouse** | Items, Material Requests, Dispatches, Returns, POs |
| **Purchasing** | Vendors, Purchase orders, Items / Groups |
| **Admin** | Settings, Users, Customization, Forms, Integrations |

---

## 11. Everyday tips

- Keep **Statuses** consistent—do not invent free-text status when a configured status exists.
- Place pins with the correct **product / composite** before quoting or creating jobs.
- Open pin detail to verify **forms and images** before sending crews.
- Prefer creating jobs from **Locations** so pins stay linked to field work.
- Use **mass update** for bulk status or assignment changes; use detail pages for forms and one-off edits.
- When something “missing” appears in a picker (form, status, type), check **Settings** first.
- Service vs Project **Quotes** and **Jobs** stay separated in the sidebar—use the matching category for reporting clarity.

---

## 12. Module connection summary

```text
                    ┌──────────── Clients ────────────┐
                    │                │                 │
                 Contacts          Sites          Quotes / Invoices
                                       │
                                   Projects
                                       │
              ┌────────────┬───────────┼───────────┬────────────┐
              │            │           │           │            │
          Drawings     Locations     Jobs       Quotes      Forms
              │            │           │
            Pins ──────────┴───────────┤
              │                        │
           Pin forms / QA         Job forms / QA
                                       │
                          Materials → Dispatch → Returns
                                       │
                                   QR codes

Vendors → Contacts → Purchase Orders → Items / Groups / Projects
Catalog (Groups / Items / Composites) feeds Pins, Quotes, POs, Materials
Settings configures statuses, types, forms, users, and Zoho sync
```

---

## 13. Support & handover notes

When handing this guide to a client team:

1. Walk through **Workflow A** once with sample data.
2. Confirm Settings values match the client’s real statuses and types.
3. Train field users on **Jobs**, **Forms**, and **Pin detail**.
4. Train warehouse users on **Material Requests → Dispatches → Returns**.
5. Train admins on **Customization**, **Users**, and **Integrations**.

For product or configuration questions, contact your SimHo implementation owner or support contact.

---

*Document version: 1.0 · Based on the SimHo application modules and workflows available in the product.*
