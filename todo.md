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
- [ ] Replace map placeholders with real map and route data
- [ ] Add offline-friendly delegate behavior and retry handling
- [x] Add operational reports, exports, and configurable date filters
- [x] Add onboarding, help documentation, privacy terms, and branded empty states
- [ ] Add monitoring, error reporting, activity history, and notification preferences
- [ ] Add end-to-end coverage for authentication, roles, task completion, evidence capture, and responsive navigation
- [ ] Configure final deployment polish including favicon, custom domain readiness, and branded email templates

- [x] Add configurable date-range filters to reports and make CSV export respect the selected range
- [x] Add a first-login onboarding experience connected to authenticated Manager and Delegate entry points
- [x] Add tests or verification for filtered report export and onboarding/help flows

- [x] Add assertions proving report date filters change task counts and CSV values for selected ranges
- [x] Add explicit UI verification for Manager onboarding, Delegate onboarding, and the Help/Privacy route

- [ ] Compare reports.exportCsv output across different date ranges and assert exported metric values change accordingly
- [x] Perform authenticated browser verification of Manager, Delegate, and Help routes after login and record the evidence

- [x] Diagnose the reported failure when adding a Delegate by email from Administration
- [x] Fix Delegate invitation creation and preserve Manager removal/protected-admin behavior
- [x] Add regression coverage for creating a delegate invitation and verify the generated invite link through the invitation update contract

- [x] Add a regression test for re-inviting an email with an existing pending invitation and assert role/token/link updates
- [ ] Verify the authenticated Administration flow by creating a Delegate invitation after the earlier Manager removal scenario

- [x] Diagnose the administrator Copy link failure
- [x] Implement clipboard fallback and visible copy success/error feedback
- [x] Test the repaired Copy link action and save a recovery checkpoint

# Confirmed Full Improvement Roadmap

- [ ] Complete database-backed CRUD for delegates, clients, doctors, tasks, messages, visits, surgery records, geography, and visit plans
- [ ] Add task assignment and status-update forms for Manager and Delegate users
- [ ] Add client, doctor, province, city, surgery, and visit-plan forms with approval states
- [ ] Complete photo, audio, signature, GPS, timestamps, and secure evidence linkage for visits
- [ ] Add real map pins, route planning, delegate location updates, and configurable location privacy
- [ ] Add secure invitation acceptance, duplicate prevention, role separation, and protected-admin safeguards
- [ ] Add audit history, error reporting, activity monitoring, notification preferences, and backup guidance
- [ ] Add report exports with operational filters and production-ready empty/loading/error states
- [ ] Add end-to-end coverage for authentication, admin operations, tasks, evidence, maps, invitations, and mobile navigation
- [ ] Complete deployment polish: favicon, metadata, custom-domain readiness, branded email templates, privacy terms, and onboarding

- [x] Persist Delegate visit reports with a real mutation and visible loading/error/success states
- [x] Replace the Delegate visit screen static location and assignment display with live visit/client data and real map details
- [x] Surface visit-plan approval/rejection status details in the Delegate Plan tab
- [x] Add regression coverage for visit reports and visit-plan status display

- [x] Replace the Delegate visit header’s hardcoded time and city with live task and visit metadata
- [x] Show human-readable visit-plan review status with reviewer/time details when available
- [x] Add router-level regression coverage for saveVisitReport and visit-plan status output

- [x] Show live visit check-in/check-out state in the Delegate visit header summary
- [x] Resolve and display visit-plan reviewer identity when reviewedBy is available
- [ ] Add a successful normalized saveVisitReport router test without persistent fixtures
- [x] Add a router-contract test for visit-plan status output beyond the helper function

- [x] Add protected live doctor and geography directory queries and Manager-only creation procedures with audit events
- [x] Add regression coverage for directory creation permissions

- [x] Add protected live delegate directory query for authenticated task assignment
- [x] Replace Manager task delegate ID entry with a live delegate selector
