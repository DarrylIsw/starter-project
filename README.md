# Research Information System (RIS)

RIS is a role-based research administration web application for Universitas Multimedia Nusantara. It supports the full internal research lifecycle: scheme setup, proposal submission, verification, reviewer assignment and scoring, management decision, funded-research monitoring, reporting, researcher profiles, letters, external research reporting, archives, and in-app notifications.

This document is the primary handoff for the next developer or agent. Read it before changing workflows, state, permissions, or the database schema.

## 1. Current Project State

The application is a working frontend prototype with a backend foundation.

- The React UI, demo accounts, roles, workflow states, and most interactions work without a live database.
- Most create, update, delete, draft, and notification interactions currently persist through browser storage, using the data gateway layer.
- The Express/PostgreSQL backend already has routing, database models, middleware, audit logging, and read-oriented endpoints. It is intentionally not yet the single source of truth for all mutations.
- Email delivery and real PDF generation are prepared as integration boundaries but must remain optional until real provider credentials and infrastructure are available.
- The root SQL schema is intended to be runnable before the future API migration. It contains a demo seed and a commented production seed.

Do not treat browser storage as production persistence. It exists to make the frontend demonstrable while the backend integration is completed incrementally.

## 2. Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, React Router, React Boilerplate conventions |
| UI | Custom reusable UI primitives, styled-components, Lucide icons |
| State and demo persistence | React state plus localStorage/sessionStorage through the RIS data gateway |
| Backend | Node.js, Express |
| Database | PostgreSQL through the pg package |
| Logging and audit | Pino, request context middleware, audit trail middleware |
| Validation | Joi |
| PDF foundation | jsPDF utilities for existing document preview/output helpers |
| Testing | Jest, React Testing Library, ESLint |

## 3. Quick Start

### Prerequisites

- Node.js 18 or newer is recommended.
- npm 9 or newer.
- PostgreSQL 14 or newer only when exercising the backend database routes.

### Install and run

~~~bash
npm install
npm start
~~~

The development application normally starts at http://localhost:3000. The Express API listens separately, normally on port 3001. If port 3001 is occupied, stop the previous Node process or set a different API port in the environment configuration.

### Important scripts

~~~bash
npm start             # Frontend development server and development entry point
npm run build         # Production frontend build
npm run build:dll     # Rebuild React Boilerplate DLL dependencies when needed
npm test              # RIS lint plus unit tests
npm run lint:ris      # Lint RIS source files
npm run test:unit     # Jest tests
~~~

For a documentation-only edit, run:

~~~bash
git diff --check
~~~

## 4. Repository Map

~~~text
starter-project/
├── app/
│   ├── components/
│   │   └── Ui.js                         Shared UI primitives and patterns
│   ├── containers/
│   │   ├── Ris/
│   │   │   ├── index.js                  RIS routing and application shell
│   │   │   ├── data.js                   Canonical demo data and browser persistence
│   │   │   ├── dataGateway.js            Persistence abstraction used by the UI
│   │   │   ├── auth.js                   Current-user and role helpers
│   │   │   ├── permissions.js            Role/menu/action authorization rules
│   │   │   ├── notificationWorkflow.js   Notification center, toast, deduplication
│   │   │   ├── emailWorkflow.js          Optional, non-blocking email integration
│   │   │   ├── pages/                    Page-level views and workflow pages
│   │   │   ├── components/               RIS-specific reusable components
│   │   │   ├── workflows/                Shared workflow utilities where present
│   │   │   └── productionDataApi.reference.js
│   │   │                                  Reference contracts for the future API migration
│   │   └── pageListAsync.js              Async page registration
│   └── ...
├── server/
│   ├── config/
│   │   └── db.js                         PostgreSQL pool configuration
│   ├── controllers/                      HTTP orchestration and validation
│   ├── models/                           Parameterized SQL queries
│   ├── routes/                           API route registration
│   ├── middlewares/
│   │   ├── requestContext.js             Request IDs and request-scoped context
│   │   ├── requestLogger.js              Structured request logging
│   │   ├── auditTrail.js                 Audit-event persistence/logging
│   │   ├── optionalUser.js               Optional identity extraction
│   │   └── errorHandler.js               Central API error responses
│   ├── services/                         Cross-cutting services such as email
│   └── index.js                          Express application creation
├── database.sql                          PostgreSQL schema, indexes, demo seed
├── .env.example                          Environment variable template
├── index.js                              Development/server entry point
├── package.json                          Scripts and dependencies
└── README.md                             This handoff document
~~~

## 5. Read These Files First

Before implementing a feature, understand these files in this order:

1. **app/containers/Ris/index.js**
   Routing, sidebar configuration, layout shell, and page entry points.
2. **app/containers/Ris/data.js**
   Demo entities, initial accounts, lifecycle records, and browser-state helpers.
3. **app/containers/Ris/dataGateway.js**
   The current persistence boundary. New data mutations should go through this layer rather than writing directly to localStorage in a page.
4. **app/containers/Ris/permissions.js** and **auth.js**
   Roles, per-admin scopes, menu visibility, action-level access, and manager mode switching.
5. **app/containers/Ris/notificationWorkflow.js**
   In-app notification creation, deduplication, recipient logic, and toast behavior.
6. **app/containers/Ris/productionDataApi.reference.js**
   The proposed REST contracts for replacing browser persistence with API calls.
7. **database.sql**
   Target relational model, migration-safe constraints, seed options, indexes, and SQL comments.
8. **server/index.js** and **server/routes/index.js**
   Current backend route registration and middleware order.

## 6. Runtime Architecture

~~~text
React pages/components
        |
        v
RIS workflow functions and dataGateway
        |
        +--> Current implementation: browser persistence and demo data
        |
        +--> Future implementation: Express REST API
                                   |
                                   v
                              PostgreSQL
                                   |
                                   +--> audit trail
                                   +--> optional email/PDF services
~~~

The UI must not assume that storage is browser-only. When adding a mutation, keep the UI dependent on a domain-oriented gateway function so it can later be swapped to an asynchronous API request with minimal page changes.

## 7. Roles, Access, and Account Model

### Permanent account roles

| Role | Purpose |
| --- | --- |
| Super Admin | Full access to the entire system, all users, all administrative scopes, archives, and final decisions. |
| Manager | Management-level access comparable to Super Admin, plus a switchable lecturer view for personal lecturer workflows. |
| Admin | Scoped administrator. Each account may receive only research management, letter management, profile management, or a combination. |
| Lecturer | Researcher who manages profile information, submits proposals, performs funded-research obligations, requests letters, and reports external research. |

Student is no longer a supported permanent role. Reviewer is not a separate permanent role.

### Temporary reviewer assignment

Reviewer is an assignment granted to a lecturer for a particular review target:

- Internal research proposal.
- Monev submission or monitoring item.
- Final/interim report.
- Output report.

The lecturer keeps normal lecturer capabilities. The reviewer menu and review form appear only while an active assignment exists. The assignment is removed after the final administrative decision or when it is explicitly revoked.

The demo account **reviewer@umn.ac.id** represents lecturer **Dr. Andini Prameswari**. It becomes a reviewer only after an administrator assigns her to a relevant review target.

### Admin scopes

An Admin account can have one or more scopes. Sidebar menus and direct actions must both enforce them.

| Scope | Typical capabilities |
| --- | --- |
| Research management | Create schemes, verify proposals, assign reviewers, make or assist with decisions, manage funded research monitoring. |
| Letter management | Receive letter requests, accept or decline them, build requested fields, verify submitted data, issue completed letters. |
| Profile management | Create and edit accounts, verify researcher profiles, deactivate eligible accounts. |

Super Admin and Manager have all scopes. Admin cannot manage a Manager account; Manager and Super Admin can manage all relevant accounts according to the business rules.

### Manager modes

Manager has two sidebar modes:

- **Management mode** provides management and administrative features.
- **Lecturer mode** provides the manager's own researcher, proposal, funded-research, letter-request, and external-report features.

The mode switch changes navigation only. It must not duplicate notifications or grant an unauthorised Admin scope. A Manager in lecturer mode can still create a letter request.

## 8. Demo Accounts

The exact passwords and seed accounts are defined in **data.js** and **database.sql**. Keep frontend demo data and SQL demo seed semantically aligned.

Representative accounts:

| Account | Intended use |
| --- | --- |
| superadmin@umn.ac.id | Full-system administration demo |
| manager@umn.ac.id | Management and lecturer-mode demo |
| admin.penelitian@umn.ac.id | Research-management-only Admin demo |
| admin.surat@umn.ac.id | Letter-management-only Admin demo |
| admin.profil@umn.ac.id | Profile-management-only Admin demo |
| lecturer@umn.ac.id | Standard lecturer workflow demo |
| reviewer@umn.ac.id | Dr. Andini Prameswari reviewer-assignment demo |

Never use seeded passwords outside local/demo environments.

## 9. Core Domain Workflows

### 9.1 Research scheme and proposal lifecycle

Administrative users create a research scheme. A scheme can receive multiple proposals; it is not limited to one proposal or one lecturer.

Scheme setup includes:

- Title, description, year, opening and closing dates.
- Eligibility criteria for prospective research leaders.
- Maximum permitted budget.
- Reporting periods and deadlines.
- One required final report period only.
- Flexible interim-report periods.
- Output-report schedule.
- Required output types and field configuration.
- Proposal/RAB templates plus extra named attachment requirements.

Lecturers browse all published schemes as an adaptive card catalogue:

- **Eligible schemes** show Detail and Register.
- **Catalogue schemes** remain visible but do not expose Register when the lecturer is not eligible.
- **Draft schemes** show a continuation action and a delete-draft action.
- **Funded research** moves out of scheme registration and into the funded-research area.

Proposal form steps:

1. Deskripsi Penelitian
2. Member
3. Anggaran
4. Luaran Hasil
5. Lampiran

Draft input persists across navigation and browser refresh. A lecturer must be able to return to a draft, continue it, edit it, or delete it fully. A student cannot register a scheme because Student is no longer a supported role.

Proposal status flow:

~~~text
Draft
  -> Submitted / Menunggu Verifikasi
  -> Terverifikasi
  -> Menunggu Reviewer
  -> Direview
  -> Menunggu Keputusan
  -> Didanai

Alternative outcomes:
  -> Perlu Revisi
  -> Ditolak
~~~

Important rules:

- Reviewer scoring never automatically approves funding.
- After one or more reviewers submit, the proposal is **Direview**, not **Didanai**.
- Super Admin, Manager, or authorised Research Admin makes the final decision.
- A decision of approval moves the proposal to **Didanai**.
- The maximum budget comparison must accept an amount exactly equal to the configured maximum.
- Required outputs are configured by the scheme. A lecturer selects at least one available required output and may select more than one.
- Additional outputs are added or removed by the lecturer in the result/output step.
- Attachment rows are driven by the selected scheme configuration. Extra attachments are not lecturer-defined.

### 9.2 Proposal monitoring and decision

For Super Admin, Manager, and Admin with research-management scope, the main menu is **Manajemen Penelitian**. It contains:

- Daftar Skema
- Monitoring Penelitian
- Monitoring Penelitian Didanai

**Monitoring Penelitian** opens at the Preview tab and has five tabs:

| Tab | Purpose |
| --- | --- |
| Preview | Submitted proposal list and read-only proposal preview. |
| Verifikasi | Completeness checking before reviewer assignment. |
| Reviewer | Assign one or more lecturer-reviewers, remind them, and inspect review results. |
| Keputusan | Final administrative decision after verification and review. |
| Pengumpulan Kontrak | Access to post-funding contract follow-up where relevant. |

The verification table tracks title, year, scheme, status, a verification action, and a read-only view. It must distinguish **Butuh Verifikasi**, verified, revision, and rejected states.

The reviewer table must support:

- Multiple reviewers per proposal.
- Searching/filtering lecturers eligible to review.
- Assigning and revoking reviewers.
- Temporary reviewer role activation.
- Reminder actions that create a notification and later can trigger email.
- Per-reviewer status.
- Viewing submitted scoring and comments.

The decision table includes proposal identity (title, leader, scheme), year, note, status, view, and a separate final-decision action. The final-decision modal must be the only place that changes a verified/reviewed proposal to funded, revision, or rejected.

### 9.3 Funded research and Pendataan Skema

When a proposal is approved, lecturer navigation changes:

- **Pengajuan Penelitian Internal** becomes a submenu:
  - Daftar Skema
  - Penelitian Didanai
- The funded item is no longer displayed as a registerable scheme.

The funded scheme card directs to **Pendataan Skema**. The page is organised like a section switcher, with:

1. Pengumpulan Kontrak
2. Monev
3. Laporan Final
4. Laporan Luaran
5. Logbook Penelitian

Rules for each section:

| Area | Lecturer action | Administrative action |
| --- | --- | --- |
| Contract | Upload/sign required contract documents | Review and publish signed contract material |
| Monev | View outcome and required follow-up | Assign reviewers, inspect results, issue the monev outcome |
| Interim/final reports | Submit only during open reporting periods | Open, extend, review, assign reviewers, inspect results |
| Output reports | Submit scheduled outputs with mandatory/additional output data | Open, extend, review, assign reviewers, inspect results |
| Research logbook | Maintain research activity records | Monitor and inspect entries |

Monev is an administrative evaluation of the lecturer's research progress. The lecturer cannot edit the issued monev result.

Monev and report review are separate from proposal review but use a similar temporary lecturer-reviewer model:

- Assign one or more reviewers to each target.
- Reviewer scoring forms differ by target type.
- Administrators can remind reviewers and view their results.
- Lecturer can view returned scores/comments but cannot alter reviewer data.

Suggested scoring dimensions already reflected in the UI direction:

- **Monev:** progress against plan, budget use, risks/mitigation, evidence quality, and next-period feasibility.
- **Final report:** achievement of objectives, methodology/results quality, consistency with proposal, budget accountability, documentation, and impact.
- **Output report:** output validity, metadata completeness, supporting evidence, and alignment with declared outputs.

Monitoring Penelitian Didanai uses a comprehensive table rather than progress cards. Do not reintroduce a generic progress bar to that table.

### 9.4 Letter request and issuance workflow

Only lecturers request letters. Super Admin, Manager, and Letter Admin review and issue letters; they do not use the lecturer's request-creation action.

The lecturer starts from a table of their funded research. One funded research item can have multiple letter requests.

Flow:

~~~text
Lecturer selects funded research
  -> chooses letter category/subcategory, or chooses Surat Kustom
  -> sends a request
  -> admin accepts or declines
  -> accepted request enters admin form builder
  -> admin defines required custom fields and templates
  -> lecturer fills requested fields and submits
  -> admin verifies/finalises
  -> issued letter becomes downloadable by lecturer
~~~

The current document preview is text-oriented until final PDF integration is implemented. Keep the document generation boundary independent of UI state so a PDF generator can later consume the same template data.

Letter statuses should clearly communicate the next actor, for example:

- Menunggu Verifikasi
- Ditolak
- Menunggu Data Lecturer
- Data Dikirim
- Sedang Diproses
- Perlu Revisi
- Surat Tersedia

Draft letter requests may be edited or deleted. Do not show raw data keys such as **researchTitle**, **researchYear**, or **researchDuration** to end users; only human-readable Indonesian labels are allowed in UI.

### 9.5 External research reporting

External research reporting is a standalone main sidebar menu, not nested under the former general reporting menu.

The workflow covers:

- External research record creation.
- Progress/milestone information.
- Output reporting.
- Required attachment upload.
- Admin/manager validation and feedback.

Super Admin, Manager, and Admin do not see a lecturer-style create-report button unless the account is in an authorised lecturer context. The user-facing labels must be Indonesian.

### 9.6 Researcher profile management

Lecturer and Manager-in-lecturer-mode see their own researcher profile and can edit it, including profile photo.

Profile Management Admin, Manager, and Super Admin see aggregate researcher management: counts, verification, account creation/editing, and account deactivation according to their permission rules.

The personal profile page must not show administrator-only metrics such as total profile, pending verification, verified, or incomplete. Those belong only in aggregate management views.

Account lifecycle expectations:

- Account creation has an intended role and, for Admin, one or more assigned scopes.
- Manager/Super Admin can create and manage scoped Admin accounts.
- Admin cannot deactivate a Manager.
- Manager can manage Admin accounts.
- Deactivation must deny future authenticated access without deleting audit history.
- Email notifications are optional and must not block the primary account action if email is not configured.

### 9.7 Archive

Super Admin and Manager have an **Arsip** menu at the bottom of the sidebar.

Archive is an administrative catalogue of:

- Research schemes and proposals.
- Funded research information.
- Researcher and account information.
- Relevant decision, contract, report, and output metadata.

Archive data must remain consistent with all newly added research and lecturer information. It is not an isolated copy of a few old fields. When a new domain entity is introduced, decide whether it belongs in the archive and add the corresponding read model or reference.

## 10. Sidebar and UI Behaviour

### Sidebar

- Sidebar menus are permission-driven. Never show a menu merely because a direct route exists.
- The sidebar supports collapse/expand with a slide animation.
- The burger control remains fixed near the collapsed sidebar position; it does not travel with the expanded sidebar.
- Fully collapsed mode hides all branding and menu contents, leaving only the burger control to restore it.
- Main content and responsive grids must reflow correctly in collapsed and expanded modes.
- Arsip is always the final visible administrative navigation item.
- Submenus must wrap and fit in narrow vertical space. Do not introduce horizontal scrolling to the sidebar.

### General layout

- Pages, forms, and management tables should use available viewport width rather than a narrow centred form column.
- No input label, help text, or card description may overflow, overlap, or be hidden behind a neighbouring card.
- Page section labels and helper descriptions must have independent vertical spacing.
- Use adaptive grids for scheme cards and responsive tables for dense operational data.
- Expanded scheme details use a darkened backdrop without blur. The backdrop prevents clicks outside the expanded view.
- Use Indonesian for user-facing UI: menus, buttons, statuses, forms, empty states, messages, and field labels.

### Form standards

Prefer structured input controls over manual free text:

| Data type | Preferred control |
| --- | --- |
| Year | Numeric stepper or year select |
| Reporting period/date | Date picker or start/end month selector |
| Duration | Start/end date or month fields, not manually typed prose |
| Enumerated status/category | Select, segmented control, checklist, or radio group |
| Multiple output choices | Checkbox/checklist |
| One required choice | Radio group/select |
| Budget | Currency input with number formatting and validation |
| Attachments | Named upload control with file state and delete action |

Use reusable components from **app/components/Ui.js** where possible. Avoid recreating slightly different cards, badges, modals, tables, stepper controls, and upload controls on each page.

## 11. Notifications and Email Readiness

### In-app notifications

The system uses three levels:

| Level | Use |
| --- | --- |
| Toast | Immediate result of an explicit action: save, submit, upload, delete, validation failure. |
| Notification centre/bell | Events initiated by another user, reminders, deadlines, and a persistent event history. |
| Blocking modal | Urgent action requiring acknowledgement, such as account deactivation or critical workflow expiry. |

Do not create a notification for each keystroke or field update. Proposal-update and letter-update notifications must occur only after an explicit save/submit action, and notification creation should be deduplicated.

High-value notification events include:

- Account creation, access-scope/role changes, and deactivation.
- Scheme opening for an eligible lecturer.
- Proposal submitted, revision requested, reviewed, rejected, or funded.
- Reviewer assignment, reminder, completion, revocation, and re-review.
- Contract availability and impending signature deadline.
- Reporting period opening, extension, deadline reminders, accepted/revision report outcome.
- Letter request state changes, required-data request, issuance, and document availability.
- External report validation/revision.
- Critical system integration failures.

Every actionable notification should link to the relevant record or screen, for example **Lihat Proposal**, **Beri Keputusan**, **Periksa Laporan**, or **Tanda Tangan**.

### Email is intentionally optional

Email dispatch must be fire-and-forget from the business workflow:

1. Complete the primary mutation.
2. Create the in-app notification.
3. Attempt email only when the email service is configured.
4. Log success/failure without rolling back the primary action.

Relevant files:

- **app/containers/Ris/emailWorkflow.js**
- **server/services/emailService.js**
- **server/routes/emailRoutes.js**
- **.env.example**

Expected environment settings include SMTP host, port, username, password, sender name/address, and an enable flag. Missing configuration must result in a no-op or logged skip, never a broken proposal/letter/account workflow.

## 12. Data and Persistence Boundary

### Current state

The live UI currently uses browser-backed demo state. Common entities include:

- Users, roles, admin scopes, profiles, photos, and account status.
- Schemes, schedule periods, eligibility criteria, output configurations, and attachment templates.
- Proposals, members, budgets, mandatory/additional outputs, attachments, drafts, and decisions.
- Reviewer assignments, scores, comments, and reviewer-status records.
- Funded research, contracts, monev, reports, outputs, and logbooks.
- Letter requests, form-builder fields, user-filled values, and issued documents.
- External research reports.
- Notifications and archive records.

### Required implementation rule

Do not add direct localStorage logic to page components. Add a function to **dataGateway.js** or an existing domain workflow, then invoke that function from the page.

This keeps the UI stable when the implementation changes from:

~~~text
dataGateway.saveProposal(payload)
~~~

to:

~~~text
await apiClient.post('/api/research/proposals', payload)
~~~

### Future API contract

**productionDataApi.reference.js** documents intended production operations. It is reference material, not active frontend runtime code. The next agent should move functions one domain at a time, preserving response shapes or providing a mapper at the gateway boundary.

Recommended migration order:

1. Authentication, user identity, roles, scopes, and active/deactivated access.
2. Researcher profile read/update and account administration.
3. Scheme creation/listing/detail.
4. Proposal drafts, submit, verification, reviewer assignment, and final decision.
5. Funded-research contracts, monev, reporting, outputs, and logbooks.
6. Letter workflow and document generation.
7. External reporting.
8. Notifications, email delivery, archive read models, and real-time updates.

Do not migrate one screen by bypassing the gateway while other screens still use local data. That creates split-brain state and breaks cross-role demo consistency.

## 13. Backend API Foundation

The Express server has a layered structure:

~~~text
route -> controller -> model -> PostgreSQL
~~~

Routes are registered from **server/routes/index.js** and mounted by **server/index.js**. Current API groups include:

| Endpoint prefix | Domain |
| --- | --- |
| /api/research | Schemes, proposals, funded research, reviews, reports |
| /api/letters | Letter workflow |
| /api/external-research | External research reporting |
| /api/researcher-profiles | Researcher profiles and account-related data |
| /api/email | Optional email readiness/integration endpoint |

Server responsibilities already present or expected:

- Request ID creation and propagation.
- Structured request logging.
- Optional current-user extraction until full authentication middleware replaces it.
- Central validation and error responses.
- Audit-trail records for sensitive mutations.
- Parameterized SQL only. Never concatenate user input into SQL.

When adding an endpoint:

1. Define validation in the controller.
2. Apply authorization using the same roles/scopes as the frontend.
3. Use a model function with parameterized SQL.
4. Wrap multi-table state transitions in a database transaction.
5. Add audit logging for sensitive changes.
6. Return a stable response shape documented in the data gateway/reference file.
7. Add tests for both success and forbidden/invalid cases.

## 14. Database Schema and Seeds

**database.sql** is the database bootstrap file. It is designed to capture the current frontend domain model rather than only the earliest application features.

Before running it:

1. Create the target PostgreSQL database.
2. Set database credentials in **.env** using **.env.example** as a guide.
3. Run the schema in a clean development database.
4. Use the active demo seed for local demonstrations.
5. For real deployment, remove/keep disabled the demo seed and intentionally enable only the commented production seed.

The SQL file contains two seed strategies:

- **Demo seed:** representative accounts and linked workflow records matching frontend demonstrations.
- **Production seed:** intentionally commented; only Super Admin and Manager bootstrap accounts should be created.

The schema should represent the following relational concepts:

- Roles, users, role scopes, account state, and researcher profiles.
- Research schemes, eligibility rules, schedules, output requirements, and attachment requirements.
- Proposals, members, budgets, outputs, attachments, lifecycle events, and decisions.
- Review assignments, review criteria/scores, comments, reminders, and assignment completion.
- Funded research, contracts, monev, reports, outputs, logbooks, deadlines, and extensions.
- Letter requests, requested fields, submitted values, documents, and workflow state.
- External research records and attachments.
- Notifications, audit events, and archive-compatible references.

Do not casually alter seed IDs, foreign keys, enum/check values, or status names. The frontend demo state and migration reference may rely on them. Add an explicit migration file for production schema evolution instead of repeatedly editing an already deployed bootstrap script.

## 15. Environment Variables

Copy **.env.example** to **.env** and fill only the services you will actually run.

Typical groups:

| Group | Examples |
| --- | --- |
| Server | PORT, NODE_ENV, CORS origin |
| PostgreSQL | DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, SSL setting |
| Email | EMAIL_ENABLED, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM |
| Logging | LOG_LEVEL |
| Security (future) | Session/JWT secret, trusted proxy, upload settings |

Never commit real credentials. **.env** should be ignored by Git; **.env.example** should only contain harmless placeholders.

## 16. Observability and Audit Trail

The backend is prepared for structured logs, request identifiers, and audit records. Preserve that direction during integration.

Sensitive actions that require audit events:

- Account creation, update, scope change, deactivation, and reactivation.
- Scheme creation/edit/publish/close/reopen.
- Proposal verification, reviewer assignment/revocation, decision, revision request, and funding.
- Contract publication/signing actions.
- Reporting-period open, extend, close, review, and final disposition.
- Letter acceptance/decline, field-builder changes, issuance, and document replacement.
- Archive edits.
- Email/PDF service failures that affect a requested user action.

Each audit record should include actor, action, entity type, entity ID, timestamp, request ID, before/after summary where appropriate, and source context. Do not put passwords, secrets, full tokens, or unnecessary sensitive attachment contents into logs.

## 17. Testing Expectations

Run focused checks during development and the full suite before handoff.

Minimum checks:

~~~bash
npm run lint:ris
npm run test:unit
npm run build
git diff --check
~~~

High-risk workflow changes need manual role-based verification:

1. Log in as each demo role.
2. Verify only permitted sidebar menus are visible.
3. Attempt a prohibited direct route/action and confirm it is denied or redirected.
4. Create or update a record and confirm linked views for another role reflect the same state.
5. Test draft persistence, continuation, and deletion.
6. Test reviewer assignment, review submission, and final decision separately.
7. Test scheme reporting deadlines and administrator reopen/extend actions.
8. Test responsive layout with sidebar expanded and collapsed.

For backend changes, add API tests covering:

- Validation failures.
- Missing/invalid identity.
- Forbidden scopes.
- Cross-account data access attempts.
- State transition rules.
- Transaction rollback where an operation has multiple writes.

## 18. Development Conventions

- Use ASCII by default in code files unless the file already requires another character set.
- Use Indonesian for all end-user text. English is acceptable in code identifiers, comments, README, and technical logs.
- Reuse existing UI primitives and local patterns before introducing new abstractions.
- Prefer Lucide icons for icon buttons.
- Keep cards compact with modest border radius. Do not nest decorative cards inside cards.
- Prefer explicit state machines/status constants to scattered string comparisons.
- Keep status labels separate from status codes so UI language changes do not break logic.
- Keep API/database field names stable and map them to Indonesian labels in UI.
- Do not add a broad refactor while implementing a narrow workflow fix unless it is necessary for correctness.
- Do not delete or reset unrelated user changes in a dirty worktree.

## 19. Safe Change Checklist for Agents

Before changing a workflow:

1. Identify the entity in **data.js** and its gateway methods.
2. Search for all references to its status/type values.
3. Inspect sidebar permissions and route guards for every affected role.
4. Check dashboards, archive, notifications, and related role views for the same entity.
5. Check whether the SQL schema and API reference need a matching update.
6. Implement the mutation through the data gateway.
7. Add a notification only for meaningful workflow events, not field-level editing.
8. Verify the primary action still works when email/PDF/backend configuration is absent.
9. Run targeted tests and role-based smoke checks.

Before merging:

1. Confirm the UI contains no raw field keys, English labels, overflow, or horizontal sidebar scroll.
2. Confirm administrative actions remain restricted by both menu visibility and action checks.
3. Confirm manager mode does not lose valid lecturer capabilities.
4. Confirm archived views still see new relevant data.
5. Confirm demo records remain consistent across roles.

## 20. Known Boundaries and Recommended Next Work

### Deliberately incomplete production integrations

- Browser persistence is still the active data source for many mutations.
- Authentication is not yet a production-grade session/JWT implementation.
- Email is configuration-ready but not connected to a real SMTP provider by default.
- Some document previews remain text-based instead of final signed PDF output.
- File uploads are represented in UI/demo state and need durable object storage plus malware/type/size validation.
- Notification delivery is in-app/demo-state based; database persistence and real-time delivery are future work.

### Recommended improvements before or during the backend rework

1. Replace browser mutations with API calls in the migration order described above.
2. Add a shared typed domain/status layer to reduce duplicated string values.
3. Introduce a real authentication and authorization middleware with server-side scopes.
4. Store files in object storage and persist only metadata plus signed URLs in PostgreSQL.
5. Add database migrations, fixtures, and automated seed verification.
6. Generate official letters and signed decision documents with a template/PDF service.
7. Add a background job/queue for email, deadline reminders, PDF creation, and retry handling.
8. Add pagination, server-side filtering, and indexing for large archive/monitoring tables.
9. Add end-to-end tests for the cross-role proposal, review, funded-reporting, and letter flows.
10. Add accessibility checks: keyboard navigation, focus restoration in modals, labels, contrast, and screen-reader semantics.

## 21. Suggested Agent Brief

Use the following context when delegating work:

> This is a React + Express + PostgreSQL Research Information System. The current UI is a role-based, browser-persisted demo with a backend foundation. Do not bypass app/containers/Ris/dataGateway.js for frontend mutations. Read app/containers/Ris/index.js, data.js, permissions.js, notificationWorkflow.js, productionDataApi.reference.js, and database.sql before making workflow changes. Permanent roles are Super Admin, Manager, scoped Admin, and Lecturer; Reviewer is a temporary assignment granted to a lecturer. Manager has switchable management and lecturer sidebars. Proposal reviewer scoring never makes a proposal funded by itself: verification, reviewer scoring, and final administrative decision are separate. A research scheme can have multiple proposals. Administrative menus must be hidden and action-protected by scope. Keep all UI labels Indonesian, retain responsive full-width layouts, and do not make email/PDF/backend availability block the main workflow. When adding an entity or status, update all affected role views, notification behavior, archive visibility, demo state, database schema/reference contracts, and tests.

## 22. Handoff Notes

The application has grown through iterative product work, so the most important engineering task is preserving a coherent source of truth while moving to PostgreSQL. The safest approach is not a rewrite. Migrate one well-bounded domain through the gateway, prove it with cross-role tests, then proceed to the next domain.

Keep the workflow rules above intact unless product requirements explicitly change them. They are the contract that keeps lecturer, reviewer, admin, manager, super-admin, dashboard, notification, and archive views aligned.
