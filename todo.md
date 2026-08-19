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
- [ ] Implement the missing delegate workflows from the reference app, including evidence capture, signature, media, GPS, and surgery/planning details
- [x] Add loading, error, and empty states for admin user queries and all admin mutations
- [x] Replace the placeholder email-add flow with a real invite/linking design that safely links invited emails to future logins and prevents duplicates
- [x] Confirm no additional invitation/admin-management schema migration is required for the current user-table implementation
- [ ] Add Vitest coverage for addUser, setRole, removeUser, and protected-account edge cases
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
- [ ] Add operational reports, exports, and configurable date filters
- [ ] Add onboarding, help documentation, privacy terms, and branded empty states
- [ ] Add monitoring, error reporting, activity history, and notification preferences
- [ ] Add end-to-end coverage for authentication, roles, task completion, evidence capture, and responsive navigation
- [ ] Configure final deployment polish including favicon, custom domain readiness, and branded email templates
