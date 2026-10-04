# InterACT Portal — Test Plan

## Full Pipeline: Lead → Opportunity → Project → Work Order → TA Signing → Project Folder

---

## 1. Lead Intake

### Automated Tests
- [ ] Lead form submission → saved to Supabase
- [ ] Lead form → Monday board item created
- [ ] Lead form → Insightly lead created (DE + EN lead sources)
- [ ] Lead form → Email sent to connect@interactenglish.de
- [ ] Lead form → Slack #leads notification with sync status
- [ ] Lead form → Mailchimp subscription (if opted in)
- [ ] Insightly retry on transient failure

### Manual Tests
- [ ] Submit lead form in German (DE locale) → all integrations succeed
- [ ] Submit lead form in English → all integrations succeed
- [ ] Check Resend dashboard for delivery confirmation

---

## 2. Admin CRM (TO BUILD)

### Lead Management
- [ ] Admin sees all leads in a list
- [ ] Admin can view lead details
- [ ] Admin can qualify/disqualify a lead
- [ ] Admin can convert lead → opportunity

### Opportunity Management
- [ ] Opportunity created from lead with pre-filled data
- [ ] Admin can edit opportunity (deal value, program, dates, etc.)
- [ ] Admin can change stage (negotiation, proposal, won, lost)
- [ ] "Won" stage → auto-creates project

---

## 3. Project Creation (Monday Webhook)

### Automated Tests
- [ ] Monday deal_stage → "Won" triggers webhook
- [ ] Project created in Supabase with Monday data
- [ ] Default task templates copied to project
- [ ] Auto-generated docs: Info Sheet (pre-filled), Schedule Template
- [ ] Static docs auto-attached: Checklist PDF, Prep Guide PDF
- [ ] Teacher contact saved from Monday (email, name, phone)
- [ ] Teacher token generated
- [ ] Duplicate webhook calls don't create duplicate projects (upsert)

### Manual Tests
- [ ] Change deal to "Won" in Monday → check /admin/projects
- [ ] Verify Info Sheet has correct school/dates/program data
- [ ] Verify static PDFs are accessible

---

## 4. Admin Project Preparation

### Automated Tests
- [ ] Admin can view project details
- [ ] Admin can edit project notes
- [ ] Admin can change project status (upcoming/active/completed)
- [ ] Admin can create native document (TipTap editor)
- [ ] Admin can upload file document
- [ ] Admin can publish/unpublish documents
- [ ] Admin can set document visibility (ta/teacher/both/admin)
- [ ] Admin can add tasks to project
- [ ] Admin sees team (assigned TAs)
- [ ] Admin sees attendance summary

### Manual Tests
- [ ] Create a native doc with TipTap → verify formatting
- [ ] Upload a PDF → verify download works
- [ ] Set doc visibility to "teacher" → verify TA can't see it

---

## 5. Teacher Invite

### Automated Tests
- [ ] Admin clicks "Invite Teacher" → email sent
- [ ] Email contains correct project name and school
- [ ] Email link contains valid token
- [ ] Token URL loads the school portal (no login)
- [ ] Resend invite works (new email sent)

### Manual Tests
- [ ] Click invite link from email → lands on school project page
- [ ] School portal shows project details
- [ ] School portal shows teacher-visible documents only
- [ ] School portal shows TA profiles

---

## 6. Teacher Student Management

### Automated Tests
- [ ] Teacher can create a group (name, grade, english level)
- [ ] Teacher can add students (first name, last name)
- [ ] Teacher can add student needs notes
- [ ] Teacher can delete a student
- [ ] Teacher can add multiple groups
- [ ] Invalid token returns 404

### Manual Tests
- [ ] Add group "Klasse 7a" with 5 students
- [ ] Add special needs notes for a student
- [ ] Verify data persists on page reload

---

## 7. Work Order Creation & Sending

### Automated Tests
- [ ] Admin can create work order (all fields)
- [ ] Admin can save as draft
- [ ] Admin can send work order to TA
- [ ] TA receives email with direct link to WO
- [ ] Slack #work-orders notification on send
- [ ] In-app notification to TA with deep link

### Manual Tests
- [ ] Create WO linked to a project
- [ ] Send to TA → check email arrives
- [ ] Check Slack notification

---

## 8. TA Work Order Signing

### Automated Tests
- [ ] TA can view unsigned work order
- [ ] TA can draw signature
- [ ] TA can type signature
- [ ] Sign button shows loading state
- [ ] PDF generated with both signatures (TA + company auto-sign)
- [ ] PDF uploaded to Supabase storage
- [ ] Work order status → "signed"
- [ ] TA confirmation email with PDF attached
- [ ] Admin email notification
- [ ] Slack #work-orders notification
- [ ] In-app notification to admins with deep link
- [ ] TA linked to project (project_tas junction table)
- [ ] TA can download signed PDF

### Manual Tests
- [ ] Sign WO → verify PDF has company auto-signature
- [ ] Check TA portal shows "signed" status
- [ ] Check admin portal shows signature

---

## 9. TA Work Order Decline

### Automated Tests
- [ ] Decline modal opens with two options
- [ ] Must select reason before confirming
- [ ] "No longer available" → auto-removes availability for WO dates
- [ ] "Prefer not to go" → keeps availability, optional comment
- [ ] Comment field appears after selecting reason
- [ ] Work order status → "declined"
- [ ] Admin email with decline reason
- [ ] Slack notification with reason
- [ ] In-app notification to admins

### Manual Tests
- [ ] Decline with "no longer available" → check availability calendar
- [ ] Decline with comment → check admin sees full reason

---

## 10. TA Project Folder

### Automated Tests
- [ ] TA sees project after signing WO
- [ ] Overview tab: countdown, team profiles, task progress
- [ ] Tasks tab: 5 default tasks, can check/uncheck
- [ ] Documents tab: published docs filtered by ta/both visibility
- [ ] Attendance tab: shows groups/students added by teacher
- [ ] Travel tab: Lanes & Planes link
- [ ] TA profile cards render live from DB
- [ ] Profile card updates when TA changes profile data

### Manual Tests
- [ ] Check all 5 tabs render correctly
- [ ] Check off tasks → progress bar updates
- [ ] Read native doc inline
- [ ] Download file doc
- [ ] Verify attendance shows teacher-entered students

---

## 11. TA Attendance Roll

### Automated Tests
- [ ] TA sees groups and students (entered by teacher)
- [ ] TA can mark present/absent/late per student per day
- [ ] Date columns auto-generated from project dates (weekdays only)
- [ ] Attendance saves on each tap
- [ ] Attendance persists on reload

### Manual Tests
- [ ] Mark attendance on phone/tablet (responsive)
- [ ] Mark all students present for a day
- [ ] Change a student from present to absent

---

## 12. TA Calendar

### Automated Tests
- [ ] Calendar page loads
- [ ] Projects shown as spanning bars on correct dates
- [ ] Green = signed, yellow = unsigned
- [ ] Upcoming sidebar shows next projects
- [ ] Calendar starts on month of next project
- [ ] Navigate months (prev/next)

### Manual Tests
- [ ] Verify bars span correct date range
- [ ] Click project bar → navigates to project

---

## 13. TA Work Order Table

### Automated Tests
- [ ] Table loads with all columns
- [ ] Filter tabs: All, Unsigned, Signed, Declined (with counts)
- [ ] Deadline countdown shows correctly
- [ ] View button on all WOs
- [ ] PDF button on signed WOs
- [ ] Project button on signed WOs with linked project
- [ ] "unsigned" label (not "sent")

---

## 14. Notifications

### Automated Tests
- [ ] In-app notification bell shows unread count
- [ ] Clicking notification navigates to correct page (deep link)
- [ ] Work order signed → admin notification with link
- [ ] Work order declined → admin notification with link
- [ ] Work order sent → TA notification with link

---

## 15. School Teacher Portal

### Automated Tests
- [ ] Token URL loads project (no auth required)
- [ ] Invalid token shows 404
- [ ] Project details displayed correctly
- [ ] Only teacher/both visibility docs shown
- [ ] TA profile cards displayed (school variant)
- [ ] Homestay profiles shown when accommodation = homestay
- [ ] Student management works (add/delete groups and students)

### Manual Tests
- [ ] Full teacher flow: click invite → add students → view docs
- [ ] Verify no TA-only docs are visible

---

## 16. Cross-cutting

### Email (Resend)
- [ ] All emails delivered (check Resend dashboard)
- [ ] Email content correct (names, links, attachments)
- [ ] Direct links in emails work

### Slack
- [ ] #leads channel: new leads with sync status
- [ ] #work-orders channel: sign/decline/send/cancel events

### Data Integrity
- [ ] No duplicate projects from repeated webhooks
- [ ] No duplicate TA assignments
- [ ] Declined WO availability auto-update works correctly
- [ ] Document visibility enforced (TA can't see teacher-only docs)

---

## Playwright Test Coverage (36 tests)

| Suite | Tests | Status |
|-------|-------|--------|
| TA Flow | 13 | ✅ |
| Admin Flow | 11 | ✅ |
| Work Order Lifecycle | 5 | ✅ |
| Decline Flow | 7 | ✅ |

### Tests to Add
- [ ] School teacher portal flow (token access, add students)
- [ ] Project folder tabs (overview, tasks, docs, attendance, travel)
- [ ] Lead submission e2e
- [ ] CRM pipeline flow (when built)
- [ ] Attendance marking
- [ ] Document visibility enforcement
