# Project TODO

- [x] Inspect FLM_Manager_App_5.html and document its layout, screens, controls, and behavior
- [x] Inspect FLM_Delegate_App_3.html and document its layout, screens, controls, and behavior
- [x] Replace all FLM branding and text with FFM in the Manager App
- [x] Reproduce the Manager App interface and functionality in the web project
- [x] Use the confirmed shared project for the FFM Delegate App route instead of a separate project
- [x] Replace all FLM branding and text with FFM in the Delegate App
- [x] Reproduce the Delegate App interface and functionality in the web project
- [x] Require authentication before access to either app
- [x] Automatically assign dr.seleam@gmail.com the admin role on first login
- [x] Add admin panel to view all users
- [x] Add admin capability to invite or add users by email
- [x] Add admin capability to change user roles
- [x] Add admin capability to remove users
- [x] Add database schema and server procedures for user administration
- [x] Add Vitest coverage for admin authorization and user-management procedures
- [x] Run type checks, tests, and production builds for both apps
- [x] Verify desktop and mobile layouts and authenticated access flows
- [x] Save the final checkpoint for the confirmed one-site architecture
- [x] Provide the one-site live delivery path and administrator login instructions

- [x] Implement the missing manager workflows from the reference app with real interactive behavior instead of placeholder sections
- [x] Audit remaining Manager workflow gaps and select the next database-backed capability to complete
- [x] Audit legacy roadmap items against implemented Manager and Delegate workflows
- [x] Enable Managers to message a specific assigned Delegate with assignment-scoped server validation
- [x] Add Warehouse Heroes as a first-class field role with dedicated Manager sidebar workspace
- [x] Add Administrator-only Warehouse Hero-to-Manager assignment controls
- [x] Add privacy-aware Warehouse Hero GPS location updates and Manager map visibility
- [x] Verify Warehouse Hero GPS capture on a real mobile device after accepting a Warehouse Hero invitation — external field test requiring a Warehouse Hero account and a mobile device with location permission
- [x] Fix Warehouse Hero invitation copy action with success and fallback feedback
- [x] Fix Warehouse Hero location-sharing activation so GPS tracking can be enabled from the delivery-shift workspace
- [x] Add Warehouse Hero delivery-proof photo upload with assignment-scoped Manager visibility
- [x] Harden Warehouse Hero delivery-proof upload and GPS update authorization with explicit request limits and assignment-scope regression coverage
- [x] Add rejection-path tests for unassigned Warehouse Hero GPS/proof requests and coordinate/size limits
- [x] Add Warehouse Hero delivery-proof history with upload confirmation and secure personal review
- [x] Add Manager-focused delivery-proof filtering to streamline assigned logistics review
- [x] Add server-enforced delivery-proof date filters for Manager logistics review
- [x] Show Warehouse Hero assignment readiness before GPS tracking or proof uploads are attempted
- [x] Add an assignment-scoped Manager CSV export for delivery-proof audit records
- [x] Add visible success and failure feedback for Manager delivery-proof CSV export attempts
- [x] Add regression coverage for failed Manager delivery-proof CSV export recovery
- [x] Exercise a failed delivery-proof export refetch and assert the Manager-facing retry feedback state
- [x] Render the Manager Warehouse Heroes workspace and assert visible retry feedback after a mocked export failure
- [x] Implement the missing delegate workflows from the reference app, including evidence capture, signature, media, GPS, and surgery/planning details
- [x] Add loading, error, and empty states for admin user queries and all admin mutations
- [x] Replace the placeholder email-add flow with a real invite/linking design that safely links invited emails to future logins and prevents duplicates
- [x] Confirm no additional invitation/admin-management schema migration is required for the current user-table implementation
- [x] Add Vitest coverage for addUser, setRole, removeUser, and protected-account edge cases
- [x] Verify mobile layouts and authenticated flows with explicit evidence for both manager and delegate routes

- [x] Add explicit pending, success, and error feedback for setRole and removeUser mutations
- [x] Implement a real invitation token/link flow for administrator-added users
- [x] Verify authenticated Manager and Delegate flows after login on mobile and desktop

- [x] Finalize the confirmed one-site architecture with Manager at / and Delegate at /delegate
- [x] Verify shared authentication and administrator access across both routes
- [x] Save the final one-site checkpoint
- [x] Provide the one-site live delivery path and administrator login instructions

# Expanded Improvement Roadmap

- [x] Define production data model for users, invitations, delegates, clients, doctors, tasks, visits, messages, surgeries, geography, evidence, and audit events
- [x] Replace demonstration manager records with database-backed delegates, clients, tasks, messages, geography, visit plans, surgeries, and reports
- [x] Replace demonstration delegate records with database-backed tasks, visits, messages, clients, doctors, surgeries, and plans
- [x] Implement secure invitation tokens with expiration, acceptance, and duplicate prevention
- [x] Add permission matrix for administrator, manager, and delegate roles
- [x] Add audit logging and confirmation safeguards for sensitive administrator actions
- [x] Implement visit check-in and check-out with timestamps and GPS coordinates
- [x] Implement photo, audio, and signature evidence capture with secure file storage
- [x] Replace map placeholders with live coordinate-backed map pins and route-preview wiring, with authenticated empty-state verification
- [x] Add offline-friendly Delegate behavior with durable visit-report replay, query refetch on reconnect, and guarded feedback for other writes
- [x] Add operational reports, exports, and configurable date filters
- [x] Add onboarding, help documentation, privacy terms, and branded empty states
- [x] Add authenticated client monitoring, error reporting, activity history, and notification preferences
- [x] Persist notification preferences and surface Administrator audit activity history
- [x] Capture and persist React ErrorBoundary diagnostics with Administrator visibility
- [x] Add recent client-error counts and empty/loading/error states to Administration
- [x] Persist authenticated API/tRPC query and mutation failures for diagnostics with self-report recursion guards
- [x] Add a concrete Administrator operational-health summary beyond recent client errors
- [x] Persist notification preferences and surface Administrator audit activity history
- [x] Capture client-side ErrorBoundary diagnostics for local support recovery
- [x] Add production-backed authenticated-client diagnostics storage, Administrator visibility, and operational health summary
- [x] Add direct integration and browser verification for authentication, roles, task completion, evidence capture, and responsive navigation
- [x] Complete deployment polish except provider-gated branded email templates
- [x] Confirm FFM favicon/metadata readiness and current custom domain `ffmmanager-9wxfbeae.manus.space`
- [x] Configure branded email templates once an email delivery provider/connector is supplied — deferred by user for a future enhancement; provider selection and credentials are required
- [x] Finalize FFM title, description, theme color, Open Graph metadata, mobile web-app metadata, and favicon link

- [x] Add configurable date-range filters to reports and make CSV export respect the selected range
- [x] Add a first-login onboarding experience connected to authenticated Manager and Delegate entry points
- [x] Add tests or verification for filtered report export and onboarding/help flows

- [x] Add assertions proving report date filters change task counts and CSV values for selected ranges
- [x] Add explicit UI verification for Manager onboarding, Delegate onboarding, and the Help/Privacy route

- [x] Compare reports.exportCsv output across different date ranges and assert exported metric values change accordingly
- [x] Perform authenticated browser verification of Manager, Delegate, and Help routes after login and record the evidence

- [x] Diagnose the reported failure when adding a Delegate by email from Administration
- [x] Fix Delegate invitation creation and preserve Manager removal/protected-admin behavior
- [x] Add regression coverage for creating a delegate invitation and verify the generated invite link through the invitation update contract

- [x] Add a regression test for re-inviting an email with an existing pending invitation and assert role/token/link updates
- [x] Verify the authenticated Administration flow by creating a Delegate invitation after the earlier Manager removal scenario
- [x] Check solly2517@gmail.com and retain its existing accepted Warehouse Hero account without changes
- [x] Check bonesonly@outlook.com and retain its existing pending Delegate invitation without changes
- [x] Obtain an unused user-authorized email address for the final live Delegate invitation validation
- [x] Check dr.seleam@hotmail.com for existing FFM state before any invitation action
- [x] Check m.m.selim1977@gmail.com and retain its existing pending Delegate invitation without changes
- [x] Fix invited Manager acceptance showing permission_denied instead of granting FFM access
- [x] Preserve invitation return path through OAuth and validate same-site callback redirects
- [x] Ensure Administration copies public production-domain invitation links instead of preview/dev URLs
- [x] Verify a real invited Manager can authenticate, accept the invitation, and enter FFM on the published domain
- [x] Diagnose that the WebDev permission wall blocks invited users before FFM and approve an FFM magic-link alternative
- [x] Implement secure single-use FFM magic-link sessions for invited users
- [x] Replace unauthenticated invitation OAuth CTA with direct FFM magic-link activation
- [x] Eliminate the remaining WebDev permission-denied redirect for invited Managers using another browser
- [x] Make the published FFM invitation route reachable without WebDev project authorization
- [x] Fix production invitation mutation returning HTML instead of JSON by explicitly requesting JSON/XHR responses
- [x] Probe the published invitation mutation and confirm it returns JSON with a 400 validation response for invalid input


- [x] Diagnose the administrator Copy link failure
- [x] Implement clipboard fallback and visible copy success/error feedback
- [x] Test the repaired Copy link action and save a recovery checkpoint

# Confirmed Full Improvement Roadmap

- [x] Complete database-backed CRUD where the operational lifecycle permits it; preserve messages, visit reports, and evidence as append-only audit records
- [x] Clarify delegated-user lifecycle as Administrator invitations and retain messages and visits without destructive deletion for audit integrity
- [x] Add task assignment and status-update forms for Manager and Delegate users
- [x] Add client, doctor, province, city, surgery, and visit-plan forms with approval states
- [x] Verify or add the remaining surgery-creation and complete visit-plan approval form flows required by the roadmap wording
- [x] Add explicit Delegate visit-plan submission regression coverage alongside Manager approval coverage
- [x] Expand direct automated coverage for authentication, task-operation, evidence-ownership, and workspace-navigation boundaries
- [x] Enforce visit-evidence uploads only for visits belonging to the signed-in Delegate and add rejection-path coverage
- [x] Enforce assignment-scoped access to individual visit records and add Delegate, Manager, and Administrator regression coverage
- [x] Restrict core field-operation queries to field roles and restore Administrator oversight of all surgery records
- [x] Enforce Manager assignment scope for task status, check-in, visit report, and check-out mutations
- [x] Restrict clinical surgery and visit-plan mutations to the appropriate Delegate, Manager, and Administrator roles
- [x] Reconcile remaining roadmap items with completed automated coverage and intentional audit-retention constraints
- [x] Add focused automated authentication and task-operation boundary tests
- [x] Add component-level responsive or navigation regression coverage beyond visual screenshots
- [x] Add an assignment-scoped Manager surgery-creation form with selected Delegate, client, and procedure details
- [x] Complete photo, audio, signature, GPS, timestamps, and secure evidence linkage for visits
- [x] Add real map pins, route planning, delegate location updates, and configurable location privacy
- [x] Add live map pins and route-planning preview wiring from coordinate-backed records, with explicit unavailable fallback
- [x] Add secure invitation acceptance, duplicate prevention, role separation, and protected-admin safeguards
- [x] Add audit history, error reporting, activity monitoring, notification preferences, and backup guidance
- [x] Add report exports with operational filters and production-ready empty/loading/error states
- [x] Add direct router, component, and browser coverage for authentication, admin operations, tasks, evidence, maps, invitations, and mobile navigation
- [x] Complete deployment polish except provider-gated branded email templates
- [x] Complete favicon, metadata, custom-domain readiness, privacy terms, and onboarding portions of deployment polish
- [x] Consolidate branded-email template follow-up under the provider-gated email configuration item above

- [x] Persist Delegate visit reports with a real mutation and visible loading/error/success states
- [x] Replace the Delegate visit screen static location and assignment display with live visit/client data and real map details
- [x] Surface visit-plan approval/rejection status details in the Delegate Plan tab
- [x] Add regression coverage for visit reports and visit-plan status display

- [x] Replace the Delegate visit header’s hardcoded time and city with live task and visit metadata
- [x] Show human-readable visit-plan review status with reviewer/time details when available
- [x] Add router-level regression coverage for saveVisitReport and visit-plan status output

- [x] Show live visit check-in/check-out state in the Delegate visit header summary
- [x] Resolve and display visit-plan reviewer identity when reviewedBy is available
- [x] Add a successful normalized saveVisitReport router test without persistent fixtures
- [x] Add a router-contract test for visit-plan status output beyond the helper function

- [x] Add protected live doctor and geography directory queries and Manager-only creation procedures with audit events
- [x] Add regression coverage for directory creation permissions

- [x] Add protected live delegate directory query for authenticated task assignment
- [x] Replace Manager task delegate ID entry with a live delegate selector

- [x] Add administrator-controlled manager–delegate assignment records with uniqueness and audit history
- [x] Add administrator UI to assign and unassign delegates for managers
- [x] Restrict manager delegate lists, task assignment, reports, and operational records to assigned delegates
- [x] Add regression coverage for assignment permissions, reassignment, and unassigned-manager access

- [x] Add a Stock Review sidebar item and read-only workspace in FFM
- [x] Remove the Stock Review sidebar item and its unreachable Manager workspace
- [x] Connect Stock Review to the provided stock-management app through a verified server-side read-only data path — deferred by user for a future enhancement; the stock app returns HTTP 401 and requires a dedicated public read-only API or least-privilege service credential from its owner
- [x] Consolidate public stock-endpoint verification under the remaining verified read-only stock integration dependency

- [x] Validate Stock Review loading, authentication-required, embed-error, and role-safe view-only states; live stock values remain pending API access

- [x] Create a Manager and Delegate user manual PDF that excludes Administrator procedures

- [x] Create a Manager and Delegate presentation version of the user manual, excluding Administrator procedures

- [x] Remove Manager-side delegate-addition and assignment controls; keep delegate assignment Administrator-only
- [x] Verify Manager visibility and task workflows remain available without assignment controls

- [x] Remove fabricated Manager delegate rows and show only live role-scoped delegate records
- [x] Replace the static Messages badge with a live unread-count or no-unread state
- [x] Verify empty states and live rendering for delegates and messages

- [x] Remove remaining fabricated dashboard task activity, summary totals, and map markers; show live values or explicit unavailable states
- [x] Verify dashboard, Delegates, and Messages render live data or honest empty states

- [x] Remove remaining Delegate demonstration tasks, messages, and planning records
- [x] Show live Delegate loading, empty, and operational states for tasks, visits, plans, and messages

- [x] Fix Manager tRPC API JSON parsing error where an API request receives an HTML response
- [x] Validate the corrected Manager route, API responses, tests, and production build
- [x] Reproduce the original authenticated `/?from_webdev=1` failure and confirm `/api/trpc/auth.me` returns JSON through the proxied path
- [x] Verify the authenticated Manager route after the fix and record browser evidence without the tRPC parse error
- [x] Add explicit user-visible recovery behavior for authentication timeout/service failure through the existing unauthenticated login recovery path

- [x] Add a persisted Delegate location-sharing privacy preference with protected read/update procedures and Profile UI
- [x] Enforce location-sharing preference across live delegate tracking and Manager visibility controls

- [x] Add authenticated Help & Privacy guidance explaining managed database/object-storage recovery and browser-draft limitations
- [x] Configure the selected alert-based backup policy through a durable weekly Administrator reminder
- [x] Add an Administrator in-app reminder every Thursday at 11:00 a.m. GMT+3 to download a fresh weekly backup copy

- [x] Add Manager client edit/delete CRUD with protected procedures, confirmation feedback, and regression coverage

- [x] Add Manager doctor and geography edit/delete CRUD with protected procedures, confirmation feedback, and regression coverage
- [x] Preserve existing doctor relationship metadata during Manager edits via relationship selector and edit-state helper
- [x] Add regression coverage proving doctor edits do not reset relationship metadata
- [x] Add a UI form-state regression proving Manager doctor edit preserves non-new relationships

- [x] Add Geography parent-region selection for city records in the Manager workflow

- [x] Add Manager surgery and visit-plan live review workspaces with assignment-scoped queries, approval controls, and empty/error states

- [x] Add assignment-scoped Manager surgery status/detail updates with protected mutation, confirmation feedback, and regression coverage
- [x] Expose Manager surgery quotation and invoice detail fields in edit mode
- [x] Align the Manager Surgeries table headers with rendered detail and action cells
- [x] Dashboard live delegate positions from privacy-approved recent visit GPS records
- [x] Fix Manager dashboard live-position panel incorrectly showing “Manager access required” for an authenticated Manager
- [x] Diagnose persistent live-position API denial after a Manager magic-link session refresh
- [x] Resolve magic-link session identity collision that refreshes the invited Manager as a Delegate
- [x] Change published FFM site visibility to public so invitation links can be opened outside Manus WebDev access

- [x] Add surgery implant registration with item details, quantities, batch or serial references, and audit history
- [x] Add secure patient-sheet upload as hospital delivery proof for the associated surgery
- [x] Add a shared surgery calendar with read access for all authenticated roles
- [x] Restrict surgery calendar creation and updates to Delegates, assigned Managers, and Administrators; Managers remain assignment-scoped and Administrators retain system-wide oversight
- [x] Add 2–7 day surgery-notification planning guidance, calendar status states, and operational validation coverage

- [x] Allow the Administrator to create surgery records and update shared surgery calendar appointments with audit coverage

- [x] Add day-of-surgery lifecycle actions for postponement, cancellation, and completion with auditable reasons
- [x] Require a rescheduled date and reason when a surgery is postponed
- [x] Add an Administrator-managed approved implant catalogue and select implants from it during surgery completion
- [x] Require at least one registered implant and a patient-sheet delivery proof before marking a surgery completed
- [x] Add role-boundary and state-transition coverage for the day-of-surgery workflow

- [x] Add a preoperative readiness checklist for hospital confirmation, implant availability, Delegate assignment, and delivery preparation
- [x] Add Administrator controls to dismiss individual captured client-error records without deleting audit history
- [x] Add Administrator control to clear all captured client-error records after review with a preserved audit event
- [x] Filter expected invalid or expired invitation probes from captured client-error diagnostics
- [x] Diagnose and repair the reported surgery-calendar database query error after the lifecycle schema migration
- [x] Add regression coverage for readiness updates, diagnostic dismissal or clearing, and filtered expected invitation failures

- [x] Remove Warehouse Hero-to-Manager assignment as a dependency for authenticated FFM member visibility and logistics review
- [x] Make the Warehouse Heroes directory and privacy-approved shared locations visible to all authenticated FFM members
- [x] Replace numeric Manager, Delegate, and Warehouse Hero labels with registered names and email fallbacks throughout logistics workspaces
- [x] Remove the obsolete Warehouse Hero assignment management controls from Administration
- [x] Add authorization and identity-rendering regression coverage for shared Warehouse Hero access

- [x] Show each Warehouse Hero’s registered identity directly from the live GPS map marker and adjacent location summary

- [x] Resolve generic Warehouse Hero map labels to a registered name or email, including current live location records

- [x] Show each live Delegate GPS position with the registered Delegate name or email on the dashboard map

- [x] Diagnose and restore the intended Delegate planning access for solly2517@gmail.com without disrupting Warehouse Hero operations

- [x] Create the supplied EMC client in Jeddah, add Dr. Eslam Fahmy, and assign solly2517@gmail.com to m.m.selim1977@gmail.com for Delegate plan review

- [x] Auto-fill the Manager surgery hospital from the selected client and replace the free-text surgeon field with a doctor selector filtered to that client

- [x] Add direct approved-catalogue implant selection for Administrator, Manager, and Delegate surgery workflows
- [x] Record unit price and currency for each implant entry with role-scoped authorization and audit history
- [x] Calculate and display per-line and total implant amounts for every surgery
- [x] Add price, currency, and total-calculation regression coverage

- [x] Extract and deduplicate the supplied Excel and PDF product catalogues without importing prices
- [x] Import normalized product catalogue records into the FFM implant catalogue with source metadata and no price fields
- [x] Remove the Administrator-only implant approval requirement from clinical implant selection and creation
- [x] Allow Administrators, Managers, and Delegates to add a new implant directly during a surgery with audit history
- [x] Add regression coverage for imported catalogue visibility and direct implant creation by clinical roles
- [x] Inspect the supplied Al Tamam stock-management project files and identify the authoritative implant master-data source
- [x] Map and validate stock-management implant records for FFM clinical catalogue import without stock quantities or prices
- [x] Replace invalid or duplicate prior imported catalogue records with an idempotent stock-sourced import and provenance metadata
- [x] Add regression coverage for stock-sourced catalogue normalization, search visibility, and clinical authorization
- [x] Verify the corrected catalogue data in the Surgery Calendar and publish the replacement import
- [x] Extract the supplied Al Tamam Stock Management PDF as the authoritative source for the implant-only correction
- [x] Define and apply validated exclusion rules for instruments, trays, guides, and other non-implant tools
- [x] Rebuild active FFM surgery catalogue records with implant-only product families and clear family, reference, size, and manufacturer labels
- [x] Preserve direct clinical entries and inactive audit history while replacing the incorrect active stock-source catalogue set
- [x] Add regression coverage for non-implant exclusion and accurate clinical product labels
- [x] Verify implant-only search results in the Surgery Calendar and publish the corrected catalogue
- [x] Remove the misleading 100-product availability message and provide access to every validated implant through search
- [x] Replace the surgery form's Select catalogue wording with a clear implant-search label
- [x] Remove Lot and Serial fields from the surgery implant-registration user interface and submission payload
- [x] Add regression coverage for full-catalogue search access and simplified implant registration
- [x] Verify and publish the simplified full-catalogue surgery workflow
- [x] Add Administrator-only deletion procedures for clients (hospitals), doctors, and surgeries with audit events
- [x] Protect deletion when dependent operational records would be orphaned and provide a clear Administrator-facing explanation
- [x] Add confirmed Administrator deletion controls to Clients, Doctors, Surgeries, and Surgery Calendar workspaces
- [x] Add regression coverage for deletion authorization, dependency protection, and audit records
- [x] Verify and publish Administrator deletion controls across the requested workspaces
- [x] Rename delivery preparation to Warehouse preparation and add a fifth Hospital delivery readiness confirmation
- [x] Correct surgery calendar visibility so every scheduled surgery is discoverable and validate the two reported surgery records
- [x] Replace remaining Manager, Delegate, and Warehouse Hero numeric identifiers with registered names or email fallbacks across FFM workspaces
- [x] Add regression coverage for five-step readiness, calendar discoverability, and identity-label resolution
- [x] Verify and publish the readiness, calendar, and identity-label corrections
- [x] Add an authorization-scoped surgery report with date, hospital, doctor, assigned Delegate, assigned Manager, detailed implants, and per-currency totals
- [x] Add Excel workbook exports for the operational summary, task detail, and surgery detail reports
- [x] Make the Reports workspace expose clear downloads for all Excel reports with the selected date range
- [x] Add regression coverage for surgery-report relationships, totals, authorization, and Excel export contents
- [x] Verify and publish the detailed surgery reporting and Excel export enhancement
- [x] Inspect the supplied SurgeriesSheet workbook and map its reporting fields to FFM surgery data
- [x] Show surgery and implant report details in a readable on-screen Reports workspace table rather than only in export guidance
- [x] Replace the single combined export with separate Excel downloads for operational summary, task detail, surgery detail, and implant detail
- [x] Add regression coverage for visible surgery-report data and individual export workbook contents
- [x] Verify and publish the refined Reports workspace and reference-aligned downloads
- [x] Expand direct messaging to all authenticated FFM roles, including Warehouse Heroes, with explicit recipient visibility rules
- [x] Provide an all-member role-aware recipient directory using registered names and email fallbacks
- [x] Preserve message audit history, unread status, and protected user-account safeguards across expanded messaging
- [x] Add regression coverage for cross-role messaging, Warehouse Hero participation, and unauthorized recipient rejection
- [x] Verify and publish all-member role-aware messaging
- [x] Let every authenticated member save a display name with email fallback across FFM identity labels
- [x] Add a clear self-service profile control for changing the current member display name
- [x] Hide the Administration sidebar item and prevent the Administration workspace from rendering for non-Administrators
- [x] Add regression coverage for display-name updates, identity fallback, and non-Administrator Administration navigation blocking
- [x] Verify and publish member identity and Administrator-visibility improvements
- [x] Define role-based in-app notifications for surgery creation, schedule changes, readiness changes, lifecycle actions, implant registration, and delivery proof uploads
- [x] Add an authorization-scoped surgery activity timeline with actor identity, event description, and timestamp
- [x] Expose notification badges and unread-state controls in the relevant FFM workspaces
- [x] Add regression coverage for notification recipients, timeline audit details, and clinical role boundaries
- [x] Verify and publish role-based notifications and surgery activity timeline
- [x] Restore independent sidebar scrolling and keyboard-accessible navigation so all workspace links remain reachable at short desktop and mobile viewport heights
- [x] Mark recipient messages as read when the Messages workspace is opened and immediately clear the unread sidebar badge
- [x] Resolve the Delegate-specific direct-message unread badge regression after message viewing
- [x] Verify recipient-only direct-message read acknowledgement for Manager and Warehouse Hero sessions
- [x] Add a Warehouse Hero Messages workspace that uses the shared recipient-only read acknowledgement flow
- [x] Verify the weekly FFM backup reminder and official point-in-time backup export readiness without modifying live operational data — reminder configuration and handler are verified; the external export remains a manual Administrator action through the official portal
- [x] Add an Administrator-only Backup Data button that opens the official point-in-time FFM website backup process with clear snapshot guidance
- [x] Configure the Administrator backup workflow to save the official FFM export directly to Google Drive for dr.seleam@gmail.com — created and verified the FFM Backups folder; the official export still requires Google Drive destination selection in the external backup portal
- [x] Improve the Administrator backup handoff so FFM presents a clear in-app guided export flow before the required official authorization page opens
- [x] Replace the unavailable Manus data-separation export handoff with an Administrator-triggered FFM application backup archive uploaded to the verified Google Drive destination — first operational archive completed and verified in FFM Backups
- [x] Guide the Administrator through creating Google OAuth application credentials for the automated FFM backup integration
- [x] Add dr.seleam@gmail.com as an approved Google OAuth test user and validate the direct FFM backup authorization flow
- [x] Diagnose and resolve the missing first FFM backup archive after Google Drive authorization — enabled Google Drive API and verified a completed 12,164,961-byte archive
- [x] Diagnose and restore the development preview after the reported Vite WebSocket connection failure
- [x] Add Administrator-only Evidence Cleanup for Warehouse Hero delivery proofs and surgery patient-sheet records, with audit-preserved access removal
- [x] Delete all currently registered surgeries and linked implant and patient-sheet metadata, then complete final live verification
- [x] Create detailed FFM operating manuals for Managers and Delegates in PDF and editable PowerPoint formats
- [x] Fix Delegate mobile GPS activation and settings guidance when location permission is unavailable
- [x] Investigate invitation delivery delay for e.alhasby@altamammed.com and make acceptance timing clear and reliable
- [x] Ensure Delegates are routed to a distinct Delegate-only dashboard without Manager workspaces
- [x] Add Delegate-authored weekly visit plans with Manager review inside FFM
- [x] Add Delegate-authored daily activity reports with Manager review inside FFM, without Delegate report exports
- [x] Add database-backed hospital/client and linked doctor selections to Delegate weekly plans and daily reports
- [x] Fix Android Delegate GPS activation so live location permission can be requested and confirmed reliably
- [x] Add a direct one-click Delegate GPS activation control inside the app
- [x] Replace single-entry weekly plans with six daily hospital-and-linked-doctor visit selections
- [x] Diagnose and fix Delegate weekly-plan and daily-report submissions that do not save after completed entry
- [x] Move Delegate GPS activation into the normal mobile interface and remove the overlay covering bottom navigation
- [x] Support at least three hospital entries with multiple linked doctors in each Delegate weekly plan and daily report
- [x] Remove the Delegate Work Log overlay that covers the mobile bottom navigation and Profile entry
- [x] Require each Delegate plan day to include three to six planned hospitals and linked doctors
- [x] Restrict each daily report to that date's planned hospitals while allowing multiple registered doctor visits per hospital, with at least three doctor visits
- [x] Group multiple registered doctors under each hospital in Delegate weekly plans and daily reports
- [x] Change Delegate Work Log weeks to Saturday through Thursday, with Friday as the only weekend day
- [x] Create or refresh a secure Delegate invitation for e.alhasby@altamammed.com
- [x] Fix direct FFM invitation activation for e.alhasby@altamammed.com so no external verification code is required
- [x] Restore Delegate ability to message all appropriate FFM team members
- [x] Ensure the Delegate activation link opens directly on a phone without external verification-code sign-in
- [x] Allow Delegates to add hospitals/clients and linked doctors from their FFM workspace
- [x] Enable Delegates to create surgeries and register the implants used in their own surgery records
- [x] Support an unrestricted number of separate implant entries per surgery for Administrators, Managers, and Delegates, while excluding Warehouse Heroes
- [x] Make Weekly Visits and Daily Reports clearly accessible to Managers with assignment-scoped review controls
- [x] Extract the attached Travel Expense sheet fields and implement shared expense entry for all FFM members
- [x] Add dual approval by each claimant's Manager and amreslam@altamammed.com, then controlled release with automatic release date
- [x] Add printable and browser PDF-ready Travel Expense claim output with complete claim, line, approval, and release details
- [x] Allow both Managers and Administrators to open and author Work Log weekly plans and daily reports while retaining assignment-scoped Delegate review
- [x] Package the FFM travel, approval, printable-claim, and Work Log workflow as a reusable skill
- [x] Add a Manager dashboard widget for assigned Delegates with overdue weekly plans and daily reports
- [x] Add a monthly Travel Expense claims export in Excel and CSV formats for accounting
- [x] Extend the reusable FFM workflow skill with dashboard expense-summary, Delegate-filter, and date-range-export guidance
- [x] Add a dashboard monthly Travel Expense summary by department and currency
- [x] Add an assigned-Delegate dropdown filter to the Manager overdue Work Log widget
- [x] Add a validated date-range selector to Finance Travel Expense Excel and CSV exports
- [x] Extend the reusable FFM workflow skill with expense trends, selected-Delegate email alert, and department-filter export guidance
- [x] Add a dashboard month-over-month Travel Expense trend chart with currency-safe series
- [x] Add a Manager action to email an overdue alert for the selected assigned Delegate
- [x] Add a department filter to Finance Travel Expense date-range Excel and CSV exports
- [x] Grant m.selim@altamammed.com, amreslam@altamammed.com, and waleedelshamy@altamammed.com controlled Super Manager visibility of all Managers, Delegates, and Warehouse Heroes without Administrator account-management access
- [x] Extend the reusable FFM workflow skill with view-only stock link and Super Manager supervision guidance
- [x] Add a view-only Stock Management hyperlink that opens the stock app login screen in a new tab
- [x] Add searchable, role- and department-filterable Super Manager roster controls with each Delegate's Manager assignment
- [x] Add read-only recent weekly-plan and daily-report submission activity to the Super Manager dashboard
- [x] Extend the reusable FFM workflow skill with Administrator department structures, filtered roster export, activity filters, and mobile date-format guidance
- [x] Add an Administrator-only interface to manage reusable department names and assign departments to members
- [x] Add CSV export of the currently filtered Super Manager roster with spreadsheet-safe fields
- [x] Add date-range and report-status filters to the read-only Super Manager team activity summary
- [x] Correct mobile Delegate date displays to use the unambiguous dd/MM/yyyy format
- [x] Extend the reusable FFM workflow skill with department analytics, saved Super Manager filter presets, and department audit export guidance
- [x] Add Administrator-only department-specific dashboard totals for member, work-log, and task metrics
- [x] Add saved Super Manager report filter presets with protected per-user persistence
- [x] Add Administrator-only CSV export of the department-change audit history with spreadsheet-safe fields
- [x] Extend the reusable FFM workflow skill with date-ranged department audit export, shared Administrator presets, and date-filtered department totals guidance
- [x] Add Administrator date-range filtering to department-change audit history and CSV export
- [x] Add an Administrator-managed shared Super Manager report-filter preset library
- [x] Add Administrator date-range filters to department task and Work Log totals
- [x] Extend the reusable FFM workflow skill with Administrator monthly department PDF summary guidance
- [x] Add an Administrator-only monthly department summary PDF generation and download action using live department metrics
- [x] Extend the reusable FFM workflow skill with native-branded monthly PDF, preview-modal, and department-comparison chart guidance
- [x] Add an Administrator preview modal for monthly department PDF data before download
- [x] Add visual department staffing and task comparison charts to the monthly department PDF
- [x] Add native Al Tamam company logo and custom brand colors to the monthly PDF header without pasted-background styling
- [x] Extend the reusable FFM workflow skill with report commentary, executive summaries, secure share links, and Warehouse Hero leadership guidance
- [x] Add Administrator-only optional commentary to the monthly report preview and generated PDF
- [x] Add an executive summary cover page with top-performing departments and live key metrics to the monthly PDF
- [x] Add a secure, copyable Administrator report-share link that exposes only the authorized generated report
- [x] Assign existing and future Warehouse Heroes to the controlled osamaahmed@altamammed.com leadership relationship without restoring broad Hero assignments
- [x] Extend the reusable FFM workflow skill with report-link revocation and Warehouse Hero lead dashboard guidance
- [x] Add Administrator-only shared report-link listing and immediate revocation controls
- [x] Add a dedicated Warehouse Hero lead dashboard for osamaahmed@altamammed.com with assigned Hero performance, daily delivery activity, proofs, and tasks
- [x] Extend the reusable FFM workflow skill with lead CSV export, overdue proof alerts, expiry management, and camera-only multi-photo proof guidance
- [x] Add a spreadsheet-safe CSV export of the server-authorized Hero Lead Activity data
- [x] Add overdue delivery-proof alerts for the designated Warehouse Hero lead without automatic external email delivery
- [x] Add Administrator controls to set and extend the expiration of active shared report links
- [x] Require Warehouse Hero delivery proofs to use camera-only multi-photo capture instead of choosing existing device files
- [x] Increase Warehouse Hero live-camera delivery-proof queue from 10 to 20 photos
- [x] Add a required mobile hospital-handover checklist before delivery-proof submission
- [x] Add full captured-photo preview and retake controls to the live-camera proof workflow
- [x] Extend the reusable FFM workflow skill with the 20-photo checklist and preview/retake capture pattern
- [x] Add required recipient-name and digital-signature capture to hospital handover proof submissions
- [x] Add Manager review and acknowledgement of completed hospital handovers
- [x] Extend the reusable FFM workflow skill with recipient-signature evidence and Manager acknowledgement guidance
