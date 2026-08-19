# Project TODO

- [x] Inspect FLM_Manager_App_5.html and document its layout, screens, controls, and behavior
- [x] Inspect FLM_Delegate_App_3.html and document its layout, screens, controls, and behavior
- [x] Replace all FLM branding and text with FFM in the Manager App
- [x] Reproduce the Manager App interface and functionality in the web project
- [ ] Create and initialize the separate FFM Delegate App web project
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
- [ ] Run type checks, tests, and production builds for both apps
- [x] Verify desktop and mobile layouts and authenticated access flows
- [ ] Save final checkpoints for both apps
- [ ] Provide live-app delivery paths and administrator login instructions

- [ ] Implement the missing manager workflows from the reference app with real interactive behavior instead of placeholder sections
- [ ] Implement the missing delegate workflows from the reference app, including evidence capture, signature, media, GPS, and surgery/planning details
- [ ] Add loading, error, and empty states for admin user queries and all admin mutations
- [ ] Replace the placeholder email-add flow with a real invite/linking design that safely links invited emails to future logins and prevents duplicates
- [ ] Add invitation/admin-management schema changes if required, generate and apply migrations
- [ ] Add Vitest coverage for addUser, setRole, removeUser, and protected-account edge cases
- [ ] Verify mobile layouts and authenticated flows with explicit evidence for both manager and delegate routes
