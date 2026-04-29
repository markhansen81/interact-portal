# Interact Portal — Product Requirements Document

**Version:** 1.2
**Date:** 2026-04-29
**Status:** Draft

---

## 1. Overview

### What is Interact Portal?

A centralised multi-workspace platform for Interact — a project/event business that sends freelance Teaching Artists (TAs) to German schools to run English language programs.

### The Problem

Operations are currently split across Google Forms, Google Sheets, Monday.com, and PandaDoc. There is no single source of truth. Tracking TA compliance, contracts, and invoices is manual and error-prone.

### The Solution

One platform. Three role-based workspaces. Everything native — documents, contracts, e-signing, invoicing, notifications.

---

## 2. Users & Roles

| Role | Description |
|------|-------------|
| **Admin** | Interact staff. Full visibility. Manages TAs, sends contracts, tracks compliance. |
| **Teaching Artist (TA)** | Freelancer. Has their own workspace. Uploads docs, signs contracts, submits invoices. |
| **Teacher/School** | School contact. Phase 3 only — not in scope for Phase 1. |

### TA Categories / Groups
- Native speakers
- *(Additional categories TBD with Mark)*

---

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS |
| Auth + Database | Supabase (PostgreSQL + Row Level Security) |
| File Storage | Supabase Storage |
| Email Notifications | Resend |
| Deployment | Vercel |
| Edge Functions | Supabase Edge Functions (Deno/TypeScript) |

### Multi-tenancy
Each TA has their own workspace scoped by user ID via Supabase RLS. Admins have unrestricted access. GDPR-compliant via Supabase EU data residency.

---

## 4. Phases

| Phase | Scope |
|-------|-------|
| **Phase 1** | Admin Panel + TA Onboarding + Contracts + Invoicing |
| **Phase 2/3** | Project/School Space — schedules, job assignment, travel booking |

---

## 5. Phase 1 — Detailed Requirements

---

### 5.1 Authentication & Multi-tenancy

- Email/password login (Supabase Auth)
- Role-based routing: Admin → `/admin`, TA → `/portal`
- Admin can impersonate/view any TA workspace
- Session management, password reset via email

---

### 5.2 Super Admin Panel

#### 5.2.1 User Management

- **Invite users** — Admin sends email invite with role assignment and initial data
- **Edit users** — Update profile, role, group/category, pay level
- **Delete users** — Soft delete (retain records for invoicing/compliance history)
- **User groups/categories** — Assign TAs to groups (e.g. Native Speakers, others TBD)
- **Input pay levels manually** — Admin can set/override a TA's pay level

#### 5.2.2 TA Directory (Overview)

- Table/grid of all TAs (~80)
- Columns: Name, Photo, Category/Group, Compliance status, Pay level, Projects completed, Training status
- Filter/search by: status, compliance state, pay level, group
- Click through to individual TA profile
- Quick actions: Message, Send work order, Flag

#### 5.2.3 Individual TA Profile

- Personal info (name, photo, contact details, location)
- Document compliance panel — each doc with status + expiry
- Training completion status (set by Admin — non-editable by TA):
  - Online onboarding (complete/not complete)
  - Offline foundation training (complete/not complete)
- Contract history (framework + work orders)
- Invoice history
- Project history + level progression tracker
- Availability view (read-only from TA's availability board)
- Internal admin notes
- Chat thread with TA

#### 5.2.4 Services & Add-ons Management

Admin-managed table of all billable services/add-ons that appear in the TA invoice calculator. Fully editable — no hardcoded values.

**Each service entry includes:**
| Field | Description |
|-------|-------------|
| Name | Display name shown to TA (e.g. "Equipment Pick-up") |
| Fee | Amount in € (editable) |
| Fee type | Fixed / Per hour / Per time / Calculated |
| Trigger | Manual checkbox / Auto-applied / Conditional |
| Condition | IF program type = X / IF TA count > N / Always shown |
| Active | Toggle on/off — hidden from TA invoice if inactive |

**Behaviour:**
- Changes to fees take effect immediately for new invoices
- Existing submitted invoices retain the rate at time of submission (not retroactively updated)
- Admin can add new services, edit existing ones, or deactivate them
- Deactivated services no longer appear in the TA invoice calculator
- Services with conditions (e.g. "only show if Film Project") are configured here

**Current services (pre-populated from work order template):**
| Service | Default Fee | Type | Trigger |
|---------|------------|------|---------|
| Equipment drop-off | €15 | Fixed | Manual |
| Equipment pick-up | €15 | Fixed | Manual |
| Wallet service | TBD | Fixed | Manual (camps only) |
| Theatre Week / Film Week bonus | €25 | Fixed | Conditional: program type |
| Teaching Artist Liaison | €25 | Fixed | Conditional: 6+ TAs on project |
| Sunday night meeting with school | €10 | Fixed | Manual |
| Curriculum Development meeting | €15 | Per hour | Manual |
| Curriculum Content Development | €25 | Per hour | Manual |
| Course materials production | €10 | Per hour | Manual |
| Film edit | TBD | Fixed | Conditional: Film Project |
| Camp director | TBD | Fixed | Conditional: Film Project |
| Auto-bonus (Film/Fun project) | €50 | Fixed | Auto-applied |
| Travel time (Kulturtags — within Berlin/Brandenburg) | Lookup table | Calculated | Conditional: Kulturtags |
| Travel time (Kulturtags — outside Berlin/Brandenburg) | Lookup table | Calculated | Conditional: Kulturtags |

*Lookup tables (travel time brackets) also editable in Admin.*

---

#### 5.2.6 Contracting Space (Admin)

**Framework Contract:**
- Rich text editor with versioning
- Admin can create/update the master template
- Version history — previous versions stored and accessible
- Send to individual TA or bulk send to a group
- Track signature status per TA

**Other Signable Documents (all managed as templates with versioning):**
- Democratic Values declaration
- Self-declaration police check
- Photo release form

**Work Orders:**
- Create work order per project per TA
- Fields: Project name, school, location, start date, end date, days, program type (Program/Camp), daily rate (auto-filled from TA level), total fee
- Send to TA
- Track status: Draft / Sent / Signed / Declined
- View all work orders across all TAs (filterable by status)
- Work order PDF generated on signing

**AI TA Recommender (when creating a work order):**
- Admin enters project details (dates, location, program type)
- AI suggests the best-matched TAs based on:
  - Availability (no conflicts on those dates)
  - Program fit (TA has marked themselves as Yes/Pro for that program type)
  - Skills & qualifications (from onboarding profile)
  - Pay level (Admin can filter by level if budget is a consideration)
  - Location / travel proximity
  - Past experience with similar programs
- Results ranked by match score
- Admin selects TA from recommendations and work order is pre-filled

#### 5.2.7 TA Availability

- Admin can view TA availability (submitted by TAs)
- Read-only overview across all TAs
- Filter by date range to find available TAs for a project

#### 5.2.8 Training Completion

- Admin marks each TA's training milestones:
  - Online onboarding: complete / not complete
  - Offline foundation training: complete / not complete
- Non-editable by TA
- Displayed on TA profile

#### 5.2.9 Notifications & Alerts

- Notification centre in Admin dashboard
- Alert types:
  - Document expiring soon (configurable: 30/60/90 days)
  - Document expired
  - Contract/work order unsigned (overdue)
  - Invoice submitted (pending approval)
  - New TA registration
  - New message received
- All notifications also sent via **email** (TAs may not log in regularly)
- Admin configures which events trigger email vs in-app only

#### 5.2.10 Chatbot (Nice to have / Phase 1+)

- AI assistant for Admin to query platform data
- e.g. "Which TAs are available in Berlin in June?" / "Who hasn't signed their framework contract?"

#### 5.2.11 Messaging

- Admin ↔ TA direct messaging
- Threaded per TA
- Email notification on new message

#### 5.2.12 Nice to Have

- **TA feedback from students** — students can rate/give feedback on TAs after a project
  - *(High value — flag for Phase 1+ or Phase 2)*

---

### 5.3 TA Onboarding — Guided Flow + Parallel Checklist

Onboarding has two distinct parts:
1. **Profile & Forms** — a guided multi-step flow collecting all TA information (consolidated from 4 current Monday forms)
2. **Documents & Contracts** — parallel async checklist, items completed independently in any order

---

#### Part 1: Guided Profile & Forms Flow

A stepped, wizard-style flow that consolidates all TA questionnaires into one coherent experience. Broken into digestible sections so TAs are never overwhelmed.

**Key UX rules:**
- **Auto-save at every step** — TA can exit at any point and return exactly where they left off
- **Progress bar** — clearly shows how far through the profile setup they are
- **Can be completed across multiple sessions** — no pressure to do it all at once
- **Each section has its own completion status** — TA sees what's done, what's left

**Sections (consolidating 4 existing Monday forms):**

**Section 1 — Contact & Identity**
*(from Staff Sheet Form + TA Profile Information)*
- Full name as in passport/ID, first name, last name, preferred name/nickname
- Email, phone number (+49 format), address
- Date of birth, nationality (dropdown — 40+ countries)
- Gender (Female / Male / Non-binary / Rather not say)
- Pronouns (She/her / He/him / They/them / Other / Rather not say)
- LGBTQIA+ identification (Yes / No / Rather not say)
- Ethnicity (text)
- Caretaker status (No / Yes / Rather not say)
- Phone number visibility consent

**Section 2 — About You**
*(from TA Profile Information — personality/fun section)*
- Where are you from?
- When did you move to Germany and why? (max 100 words)
- What do you like about living in Germany?
- Favourite place to vacation?
- Something you're great at
- Something you're not great at
- What kind of art do you make or like?
- If you could have a superpower, what would it be?
- If your life was a comic book, what would the title be?
- Famous last words...
- Favourite food
- Short bio (60–80 words, used on website — optional)

**Section 3 — Language & Qualifications**
*(from Teaching Experience Form)*
- Highest level of education (Master's / Bachelor's / High school / Professional / Doctorate)
- Relevant degrees, certifications, and experiences (free text)
- Art profession? (max 50 words)
- TEFL/TESL/TESOL certification (Yes / No / In progress)
- German level (A1 / A2 / B1 / B2 / C1 / C2)
- Comfortable speaking German in a professional setting? (Yes / No)

**Section 4 — Teaching Experience**
*(from Teaching Experience Form)*
- Teaching experience by grade:
  - Grades 1–4 (ages 6–9): Yes / No
  - Grades 5–7 (ages 10–12): Yes / No
  - Grades 8+ (ages 13+): Yes / No
- Experience with kids with disabilities? (Yes / No)
  - If yes → disability types (multi-select: Autism, movement disorders, blindness, mental disability, epilepsy, hearing impairment, ADHD, learning disabilities, dyslexia)
  - If yes → describe the extent of your experience (text)

**Section 5 — Programs & Skills**
*(from TA Programs Form — InterACT Project Types 2026)*
- For each program type, TA selects: No / Yes / Pro / Pro? (where applicable)

Workshops & Weekly Programs:
- Native Speaker Week (NSW) — No / Yes / GETA
- Theatre Week — No / Yes / Pro / Pro?
- Art in Action Week
- Media Week
- Film Week
- Kids Space Adventure
- Monster Parade
- Shakespeare Workshop
- Test Preparation Workshop
- Job & Presentation Skills Workshop
- Global Speaker Week
- Debate Workshop

Kulturtag Modules:
- Theatre module — No / Yes / Pro
- Dance module — No / Yes / Pro
- Music module
- Art module

Holiday Camps:
- General
- Amazing Me
- Media
- Music & Songwriting
- Nature & Climate
- Theatre — No / Yes / Pro?
- Dance — No / Yes / Pro

Class Trips:
- Theatre — No / Yes / Pro / Pro?
- English Team Building
- Media
- Music & Songwriting
- Nature & Climate
- Dance — No / Yes / Pro

- Extra qualification (long text — optional): "Which programs are you especially qualified for due to your creative background?"

**Section 6 — Logistics**
*(from Staff Sheet Form + TA Profile Information)*
- Dietary restrictions / allergies (text)
- Willingness to stay in a homestay (Yes / No)
- Lifeguard certification (No / Yes / In progress)
- Driver's licence valid in Germany (No / Yes / In progress)
- BahnCard subscription (BahnCard 25 / 50 / 100 / None)
  - If yes → BahnCard expiration date
- Deutschlandticket subscription (Yes / No)
- Upload 2–3 high-res profile photos

**Section 7 — Payroll & Admin**
*(not currently in any form — new)*
- Full address (used on invoices — pre-filled from Section 1)
- Bank account details (IBAN, bank name)
- Tax number (Steuernummer)
- VAT number (USt-IdNr) — if VAT registered (Yes / No → if yes, enter number)
- Freelance / self-employed status confirmation
- *All of this pre-populates the TA's invoice template automatically*

---
*Notes on form consolidation:*
- *Democratic Values Declaration* — currently a file upload in Staff Sheet. In the platform this becomes a native e-sign document sent by Admin (moved to the parallel checklist)
- *Photo Release Form* — currently in TA Profile. In the platform this becomes a native e-sign document sent by Admin (moved to the parallel checklist)
- Duplicate fields across forms (name, email) are collected once only

---

#### Part 2: Documents & Contracts — Parallel Async Checklist

After the hard gate is cleared, all remaining items are independent. Items like police checks take 2 weeks — TAs should never be blocked waiting for one thing to do another.

#### Gate 1 — Right to Work (HARD BLOCKER)

TA must upload one of:
- Work permit
- Passport
- Visa

**If not provided → nothing else unlocks. TA is clearly told why they're blocked.**
**Admin is notified immediately when this is submitted.**

Once gate cleared → all remaining items unlock simultaneously.

#### Parallel Checklist Items

| Item | Type | Expiry Logic |
|------|------|-------------|
| Extended police check (Erweitertes Führungszeugnis) | Upload | Issue date + 2 years |
| Measles vaccination proof | Upload | No expiry |
| Framework contract | E-sign (sent by Admin) | Issue date + end of calendar year |
| Democratic Values declaration | E-sign (sent by Admin) | TBD |
| Self-declaration police check | E-sign (sent by Admin) | TBD |
| Photo release form | E-sign (sent by Admin) | TBD |
| First Aid certificate | Optional upload | No expiry |

Each item has its own status: **Not started → In progress → Submitted → Verified**

Some items (contracts/declarations) can only be actioned once Admin sends them — TA sees these as "Waiting for Interact" until sent.

---

#### Onboarding Progress — TA View

- Visual checklist dashboard showing both parts
- Each item has a clear status pill
- Completion % for the profile flow
- Items that are "Waiting for Interact" clearly labelled
- Slow-moving items (e.g. police check) shown with "This can take up to 2 weeks — you can complete other items in the meantime"

#### Onboarding Progress — Admin View (per TA)

- Full checklist view — see exactly where each TA is stuck or slow
- Profile completion % + which sections are done
- Document/contract status per item
- Time since last activity on each item
- **Nudge button** — sends a reminder email/notification to TA for a specific item ("Hey, your police check has been pending for 10 days — any update?")
- Admin can also send a general "How's your onboarding going?" message
- Admin can mark uploaded documents as verified
- Overall onboarding status: Pending / In Progress / Awaiting Documents / Ready to Work

---

### 5.4 TA Workspace

#### 5.4.1 Profile
- Edit personal information
- Upload photo
- View training completion status (read-only, set by Admin)

#### 5.4.2 Documents
- Upload and manage documents from onboarding checklist
- See expiry dates and warnings

#### 5.4.3 Forms
All currently external Monday forms replaced natively:
- Teaching Experience Form
- TA Profile Information
- Staff Sheet Form
- TA Programs Form

#### 5.4.4 Availability Board
- TA marks their availability on a calendar
- Kept updated continuously (platform reminds TA to keep it current)
- Admin can view across all TAs

#### 5.4.5 Contracts & Work Orders
- View all contracts and work orders sent to them
- E-sign or decline
- Download signed PDFs

#### 5.4.6 Training Status
- View their training completion (read-only)
- Online onboarding status
- Offline foundation status

---

### 5.5 Invoicing System

There are **two separate financial submissions** a TA can make:
1. **Invoice** — payment for work performed (base pay + service add-ons)
2. **Expense Reimbursement** — separate claim for out-of-pocket costs (receipts uploaded)

#### 5.5.1 Invoice Submission Flow

TA creates an invoice against a signed work order. Invoice calculator pre-fills based on:
- Work order details (dates, days, program type)
- TA's current pay level → correct daily rate
- Any applicable service add-ons selected by TA

#### 5.5.2 Invoice Calculator — Line Items

**Base Pay:**
- Program pay scale OR Camp pay scale (determined by work order type)
- Level → daily rate (auto-filled from TA's current level)
- Days × rate = base total

**Service Add-ons (TA ticks applicable ones — fixed fees):**
| Add-on | Trigger / Logic | Fee |
|--------|----------------|-----|
| Equipment drop-off | Manual checkbox (all programs) | €15/time |
| Equipment pick-up | Manual checkbox (all programs) | €15/time |
| Wallet service | Manual checkbox — camp projects only | TBD |
| Theatre Week / Film Week bonus | Auto-shown IF program type = Theatre Week or Film Week | €25/project *(confirm current rate)* |
| Teaching Artist Liaison | Shown IF work order has 6+ TAs | €25/project |
| Sunday night meeting with school | Manual checkbox | €10/time |
| Curriculum Development meeting | Manual checkbox | €15/hour |
| Curriculum Content Development | Manual checkbox | €25/hour |
| Course materials production | Manual checkbox | €10/hour |
| Film edit | Shown only IF work order type = Film Project | TBD |
| Camp director | Shown only IF work order type = Film Project | TBD |
| Auto-bonus | Auto-applied IF work order type = Film Project or Fun Project | €50 *(confirm — 2020 doc shows €25 for Theatre/Film Week)* |
| Travel time (Kulturtags — within Berlin/Brandenburg) | TA enters travel time → lookup table | €4.50–€45 (by time bracket) |
| Travel time (Kulturtags — outside Berlin/Brandenburg) | TA enters travel time → lookup table + overnight | €12.50–€62.50 (by time bracket) |

**Wallet Service:**
- TA takes physical cash wallet to camp — responsible for pickup, counting, and management
- Displayed as a tickable service on camp work orders
- Fixed fee (TBD with Mark)

**Travel Time (Kulturtags only):**
- TA inputs their total travel time (calculated from Berlin HBF)
- System looks up the correct travel time pay from the bracket table
- Two tables: within Berlin/Brandenburg vs outside Berlin/Brandenburg
- Outside Berlin/Brandenburg also adds overnight allowance (€12.50) where applicable
- Travel time brackets: 1.5h increments, max €45 (within) or €62.50 (outside)

**Travel Expenses (all programs):**
- Per work order §3: Company covers necessary travel and accommodation costs
- Food allowances NOT covered
- Handled via expense reimbursement (receipts uploaded), not the invoice calculator

#### 5.5.3 Expense Reimbursement (Separate from Invoice)

A completely separate submission flow for out-of-pocket costs:
- TA adds line items: description + amount
- Uploads receipt/proof for each line item
- System totals all items
- TA submits as an expense claim (not an invoice)
- Admin reviews and approves
- Stored separately from invoices in TA's financial history
- Status: Submitted / Approved / Paid

#### 5.5.4 Pay Scale

**Level Conditions:**
- Level determined by number of qualifying 3–5 day projects taught at Interact
- 1-day and 2-day projects do NOT count toward level advancement
- Interact can promote TAs based on prior teaching experience (Admin override)
- Every 4 Professional Development workshops attended = 1 project credit toward level
- System tracks: total projects, qualifying projects, PD workshop credits, current level, next level threshold
- Current level auto-populates the correct rate in the invoice calculator

**Programs Pay Scale** (Native Speaker Week, Art and Action Week, Theatre Week, Film Week, Media Week, Class Trips, Camps, Test Prep, Workshops: Theatre, Shakespeare, Debating 1–3 days)

**2025 Programs Pay Scale** (NSW, Art in Action, Theatre Week, Film Week, Media Week, Class Trips, Test Prep, Shakespeare, Debate, Job & Presentation Skills, Monster Parade, Kids Space Adventure)

| Level | Projects | 1 day | 2 day | 3 day | 4 day | 5 day |
|-------|----------|-------|-------|-------|-------|-------|
| Level 6 | 40+ | €125 | €250 | €375 | €550 | €650 |
| Level 5 | 18+ | €112 | €224 | €336 | €445 | €560 |
| Level 4 | 11+ | €108 | €216 | €324 | €432 | €540 |
| Level 3 | 6–10 | €100 | €200 | €300 | €400 | €500 |
| Level 2 | 0–5 | €89 | €178 | €267 | €356 | €445 |
| Level 1 | Interns/work students | TBD | TBD | TBD | TBD | TBD |

**Kulturtag Rates:**
| Location | Rate |
|----------|------|
| Berlin | Full 1-day rate |
| Brandenburg | Full 1-day rate + travel stipend |
| Away (travel day before) | Full 1-day rate + €50 + travel stipend |
*2-day Away: €50 applies once. 3-day Away: no €50 (same as 3-day project rate).*

**2025 Overnight Camps Pay Scale** (separate level from Programs!)

| Level | Camps | 6 days | 7 days |
|-------|-------|--------|--------|
| Level 5 | 20+ | €700 | €815 |
| Level 4 | 11+ | €670 | €780 |
| Level 3 | 6–10 | €630 | €735 |
| Level 2 | 2–5 | €570 | €665 |
| Level 1 | — | €500 | €580 |

**Camp Director Additional Wage:** 6 days = €105, 7 days = €115

**Travel Stipend (BahnCard 50 owners only):**
| Round-trip travel time | Stipend |
|----------------------|---------|
| 2:00–5:59 hours | €25 |
| 6:00–9:59 hours | €35 |
| 10:00+ hours | €55 |

**Theatre & Film Week Additional Wage:**
| Duration | Additional |
|----------|-----------|
| 3 day | €30 |
| 4 day | €40 |
| 5 day | €50 |

**Standby TA:** €250 (on call Sunday–Thursday)

**Other:** Equipment pick up/drop off: €15/time. TA Academy PD workshop = 1 project credit toward level.

#### 5.5.5 AI Invoice Check
- On submission, AI reviews invoice for:
  - Correct rate applied for TA's current level
  - Correct pay scale (programs vs camp) matches work order type
  - Add-ons are valid for the work order type
  - Total calculation is correct
  - Flags anomalies for Admin before approval

#### 5.5.6 Invoice Design / PDF
- Professional invoice template with Interact branding
- Generated as PDF on submission
- Stored against TA profile and work order

#### 5.5.7 Admin Financial Management
- View all submitted invoices and expense reimbursements in one place
- Status pipeline: Submitted → Approved → Paid
- Approve/reject with notes
- Mark as paid
- TA notified on each status change

#### 5.5.8 Earnings & Level Dashboard (TA view)

**Pay Level Tracker:**
- Current level prominently displayed (e.g. Level 3)
- Total qualifying projects completed (3+ day projects)
- Projects needed to reach next level
- Visual progress bar toward next level
- History of all projects with: name, date, days, whether it qualified toward level
- PD workshop credits logged and counted (every 4 = 1 project credit)
- Note: Admin can manually override level (e.g. for prior experience)

**Earnings Summary:**
- Total invoiced this year
- Total paid
- Total outstanding
- Expense reimbursements: submitted / approved / paid

**Admin view (on TA profile):**
- Same level tracker visible
- Admin can manually adjust level with a note/reason
- Full project history with qualifying flag per project
- PD workshop attendance log

---

### 5.6 E-Signing (Native — replaces PandaDoc)

- Draw or type signature
- Timestamp + IP logged
- Applied to: Framework contract, work orders, democratic values, self-declaration, photo release
- Countersignature by Admin where required
- Signed PDF generated and stored
- Both parties receive signed PDF by email

---

### 5.7 Notifications System

| Trigger | Who | Channel |
|---------|-----|---------|
| Document expiring (30/60/90 days out) | Admin + TA | Email + In-app |
| Document expired | Admin + TA | Email + In-app |
| Work order sent | TA | Email + In-app |
| Work order signed | Admin | Email + In-app |
| Work order declined | Admin | Email + In-app |
| Framework contract due for renewal | Admin + TA | Email + In-app |
| Invoice submitted | Admin | Email + In-app |
| Invoice approved/paid | TA | Email + In-app |
| New message | Recipient | Email + In-app |
| New TA registered | Admin | In-app |
| TA hasn't updated availability (reminder) | TA | Email + In-app |
| Training marked complete | TA | In-app |

---

## 6. Phase 2 / 3 — Project & School Space (High Level)

*To be scoped in detail separately.*

- Project workspace per job/school engagement
- Schedule generation and upload
- TA assigned to projects — sees full project info in their workspace
- School contact workspace (Teacher role)
- Travel booking integration or tracking
- All project information in one place for all parties

---

## 7. Data Model (High Level)

| Entity | Key Fields |
|--------|-----------|
| `users` | id, email, role, group/category, created_at |
| `ta_profiles` | user_id, name, photo_url, address, bio, status, pay_level, total_projects, qualifying_projects, training_online, training_offline |
| `documents` | id, ta_id, type, file_url, uploaded_at, issue_date, expiry_date, status, verified_by |
| `contracts` | id, ta_id, type (framework/work_order/democratic_values/etc), template_version, sent_at, signed_at, pdf_url, status |
| `work_orders` | id, ta_id, project_name, school, location, start_date, end_date, days, program_type (program/camp/film/etc), daily_rate, total, status |
| `projects` | id, work_order_id, ta_id, days_count, is_qualifying (bool) |
| `invoices` | id, ta_id, work_order_id, base_amount, addons_json, total, submitted_at, status, paid_at |
| `services` | id, name, fee, fee_type, trigger_type, condition_json, active, created_at, updated_at |
| `travel_time_brackets` | id, context (within/outside), min_hours, max_hours, travel_pay, overnight_pay, total |
| `invoice_addons` | id, invoice_id, service_id, fee_snapshot, hours (if hourly), notes |
| `availability` | id, ta_id, date, status (available/unavailable/tentative) |
| `messages` | id, from_user_id, to_user_id, body, created_at, read_at |
| `notifications` | id, user_id, type, payload, read, created_at |
| `contract_templates` | id, type, version, body, created_at, created_by |

---

## 8. Open Questions / TBD

- [ ] All TA category/group names beyond "Native Speakers"
- [ ] Full pay scale — exact daily rates per level for Programs and Camp scales
- [ ] Level 6 — has it been added since 2020? What is the project threshold and daily rate?
- [ ] Camp pay scale rates — page 4 of work order doc not yet received
- [ ] Auto-bonus amount — 2020 doc shows €25 for Theatre/Film Week; Mark mentioned €50. Confirm current rate
- [ ] Wallet service fee — fixed fee amount TBD
- [ ] Film edit fee amount (for Film Project work orders)
- [ ] Camp director fee amount (for Film Project work orders)
- [ ] "Fun Project" type — confirm if this is a real program type and what auto-bonus applies
- [ ] Equipment confirmed: €15/time ✓
- [ ] Teaching Artist Liaison confirmed: €25/project ✓
- [ ] Travel time calculation confirmed: time-based from Berlin HBF, lookup table ✓
- [ ] Full list of signable documents beyond the 4 identified
- [ ] "GETA" option on NSW — what does this mean?
- [ ] "Pro?" option on some programs — what does this indicate vs "Pro"?
- [ ] Admin countersignature required on work orders? Or TA only?
- [ ] Expiry logic for Democratic Values, Self-declaration, Photo release forms
- [ ] GDPR data retention policy
- [ ] Exact TA category/group list
- [ ] Chatbot — Phase 1 or later?
- [ ] Wallet — full feature spec
- [ ] Student → TA feedback — Phase 1+ or Phase 2?

---

## 9. Out of Scope (Phase 1)

- School invoicing (Interact invoicing schools)
- Teacher/school workspace
- Travel booking
- Mobile native app (web responsive only)
- Integration with external accounting software

---

## 10. Success Criteria

- All TA data in one place — no spreadsheets needed
- Admin can see compliance status of every TA at a glance
- TAs can onboard, sign contracts, and invoice entirely within the platform
- No PandaDoc subscription needed
- Email notifications ensure nothing falls through the cracks
- Pay scale and invoice calculator eliminate manual rate calculations
