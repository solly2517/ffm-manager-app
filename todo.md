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

- [ ] Implement the missing manager workflows from the reference app with real interactive behavior instead of placeholder sections
- [x] Audit remaining Manager workflow gaps and select the next database-backed capability to complete
- [x] Enable Managers to message a specific assigned Delegate with assignment-scoped server validation
- [x] Add Warehouse Heroes as a first-class field role with dedicated Manager sidebar workspace
- [x] Add Administrator-only Warehouse Hero-to-Manager assignment controls
- [x] Add privacy-aware Warehouse Hero GPS location updates and Manager map visibility
- [ ] Verify Warehouse Hero GPS capture on a real mobile device after accepting a Warehouse Hero invitation
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
- [ ] Replace demonstration manager records with database-backed delegates, clients, tasks, messages, geography, visit plans, surgeries, and reports
- [ ] Replace demonstration delegate records with database-backed tasks, visits, messages, clients, doctors, surgeries, and plans
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
- [ ] Add end-to-end coverage for authentication, roles, task completion, evidence capture, and responsive navigation
- [ ] Configure final deployment polish including favicon, custom domain readiness, and branded email templates
- [x] Confirm FFM favicon/metadata readiness and current custom domain `ffmmanager-9wxfbeae.manus.space`
- [ ] Configure branded email templates once an email delivery provider/connector is supplied
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
- [ ] Verify the authenticated Administration flow by creating a Delegate invitation after the earlier Manager removal scenario
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

- [ ] Complete database-backed CRUD for delegates, clients, doctors, tasks, messages, visits, surgery records, geography, and visit plans
- [x] Add task assignment and status-update forms for Manager and Delegate users
- [ ] Add client, doctor, province, city, surgery, and visit-plan forms with approval states
- [ ] Complete photo, audio, signature, GPS, timestamps, and secure evidence linkage for visits
- [ ] Add real map pins, route planning, delegate location updates, and configurable location privacy
- [x] Add live map pins and route-planning preview wiring from coordinate-backed records, with explicit unavailable fallback
- [ ] Add secure invitation acceptance, duplicate prevention, role separation, and protected-admin safeguards
- [ ] Add audit history, error reporting, activity monitoring, notification preferences, and backup guidance
- [ ] Add report exports with operational filters and production-ready empty/loading/error states
- [ ] Add end-to-end coverage for authentication, admin operations, tasks, evidence, maps, invitations, and mobile navigation
- [ ] Complete deployment polish: favicon, metadata, custom-domain readiness, branded email templates, privacy terms, and onboarding
- [x] Complete favicon, metadata, custom-domain readiness, privacy terms, and onboarding portions of deployment polish
- [ ] Complete branded email templates after email delivery provider configuration

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
- [ ] Connect Stock Review to the provided stock-management app through a verified server-side read-only data path
- [ ] Enable and verify a public read-only stock endpoint for the FFM integration

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
- [ ] Configure automated database/object-storage backup operations when the hosting backup policy is supplied

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
