#import "report-theme.typ": report-accent, report-theme

#show: report-theme.with(
  title: "FFM User Manual",
  author: "FFM Operations",
  rhythm: "report",
  running-header: true,
)

#set text(font: ("Noto Sans", "DejaVu Sans"), size: 10pt)
#show link: set text(fill: report-accent)
#let callout(title, body) = block(fill: luma(245), stroke: 0.6pt + report-accent, inset: 10pt, radius: 3pt)[
  *#title*\
  #body
]
#let role(label, color) = block(fill: color, inset: 8pt, radius: 3pt)[*#label*]

// ---------- Title page ----------
#page(margin: (top: 27%, x: 2.2cm), numbering: none, header: none)[
  #set par(first-line-indent: 0em)
  #align(center)[
    #text(size: 30pt, weight: "bold", fill: report-accent)[FFM]
    #v(0.4em)
    #text(size: 24pt, weight: "bold")[User Manual]
    #v(0.8em)
    #text(size: 14pt, fill: luma(80))[Manager and Delegate Operations]
    #v(2em)
    #line(length: 40%, stroke: 0.8pt + report-accent)
    #v(2em)
    #text(size: 11pt)[Version 1.0 · August 2026]
    #v(1.5em)
    #text(size: 10pt, fill: luma(90))[
      A practical guide for secure field-force management, daily task execution, visits, evidence, reporting, and stock review.
    ]
  ]
]

// ---------- Table of contents ----------
#page(numbering: none, header: none)[
  #outline(title: [Contents], indent: 1.5em)
]

#counter(page).update(1)

= 1. Purpose and scope

FFM (Field Force Manager) is a single authenticated platform for coordinating field teams and recording operational visits. This manual covers two roles only: the *Manager*, who plans and reviews work, and the *Delegate*, who performs assigned field visits and records evidence.

#callout("Important scope boundary", [This manual intentionally excludes Administrator procedures such as inviting users, changing roles, removing accounts, and assigning delegates to managers. If you need those functions, contact the FFM Administrator.])

== 1.1 Access and security

All FFM routes require secure sign-in. Use the same account provided to you by your organization. Never share your password, invitation link, GPS device, client information, photographs, audio notes, signatures, or reports with unauthorized people. Sign out when using a shared device.

== 1.2 The two applications

#table(
  columns: (1.2fr, 2.4fr, 2.4fr),
  inset: 8pt,
  fill: (x, y) => if y == 0 { luma(230) } else { none },
  [*Area*], [*Manager*], [*Delegate*],
  [Primary route], [FFM Manager at `/`], [FFM Delegate at `/delegate`],
  [Main purpose], [Plan work, monitor progress, communicate, review reports], [Complete assigned visits, capture GPS, reports, and evidence],
  [Data access], [Operational records for the manager’s assigned delegate team], [Assigned tasks, visits, plans, messages, and personal field records],
)

= 2. Signing in and starting work

Open the FFM site and select *Sign in securely*. Complete the authentication flow in the browser. After successful login, the application opens the workspace allowed for your role. If you reach an unexpected page, refresh once and confirm that you used the correct account.

The first-login welcome panel explains the basic workflow. Select *Got it* after reading it. The panel is a guide and does not change your permissions.

#callout("If sign-in fails", [Confirm your internet connection, use the invitation email or account supplied by your organization, and contact the FFM Administrator if the account has not been invited or the role is incorrect. Do not create a second account to work around a role problem.])

= 3. Manager manual

#role("MANAGER WORKSPACE", luma(230))

The Manager workspace is a control panel for the operational records belonging to your assigned delegate team. The sidebar provides Dashboard, Delegates, Clients, Tasks, Messages, Reports, Geography, Stock Review, and other available workspaces. On smaller screens, open the menu button to display the sidebar.

== 3.1 Dashboard

The Dashboard gives a quick view of live operational activity. The summary cards show active delegates, today’s visits or task records, pending tasks, and client coverage. The live delegate positions panel provides a geographic operational view when location records are available. The activity list highlights recent client and task events.

Treat empty cards as valid operational states. For example, zero live clients or visits means that no records are currently available to your role or date range; it is not automatically an application failure.

== 3.2 Delegates and team ownership

The Delegates workspace lists the field users available to your manager scope. The list is database-backed and reflects administrator-defined manager–delegate assignments. If a delegate is missing, do not attempt to enter an ID manually or create a duplicate account. Contact the Administrator to review the assignment.

Managers can work only with delegates assigned to them. This boundary applies to task assignment, task lists, operational reports, visit plans, and surgery records.

== 3.3 Clients, doctors, and geography

The Clients workspace contains live hospitals and clinical accounts. To add a client, enter the account name and, when available, city and contact person, then select *Add client*. New records appear in the live table after the save completes.

Doctors are created from the Clients workspace. Enter the doctor’s name and specialty, select the linked client, and select *Add doctor*. Geography records are managed from Geography. Choose *Province* or *City*, enter the name, and select *Add region*. Use accurate names because these records support coverage planning and map context.

#callout("Data quality rule", [Use consistent spelling for hospital, doctor, city, and province names. Avoid creating duplicates with abbreviations or alternate spellings.])

== 3.4 Creating and updating tasks

Open *Tasks* and select a client, select an assigned delegate from the available list, choose the scheduled date and time, and select *Create task*. A task is not saved until the required client, delegate, and scheduled time are present.

The task list shows the client, delegate, scheduled time, and status. Select *Complete* only after the work has actually been completed and the required visit information has been recorded. Use *Reopen* when a completed task requires legitimate follow-up.

Managers cannot assign work to delegates outside their administrator-defined team. If a required delegate is not listed, stop and request an assignment update from the Administrator.

== 3.5 Messages

Use *Messages* for operational communication that should remain in the FFM history. Write a concise update, check the recipient or broadcast context presented by the workspace, and select *Send message*. Do not place passwords, payment details, or unnecessary personal information in messages.

The history includes sender and time metadata. Use the history to confirm whether an instruction was recorded before sending a duplicate message.

== 3.6 Reports and CSV export

Open *Reports* to review operational summaries. Enter optional From and To dates, then allow the summary to refresh. The report cards and exported CSV use the selected date range. Select *Export CSV* to download the current summary for approved business use.

Before sharing an export, confirm the date range and recipient. Reports may contain sensitive operational information. Store exported files securely and remove unnecessary copies.

== 3.7 Stock Review

*Stock Review* is a read-only workspace linked to the Al Tamam Stock Management application. The FFM workspace does not provide stock adjustment, transfer, or deletion controls. If the embedded view shows a login screen or cannot load, select *Open stock app* and authenticate there using the approved account.

The current FFM connection is designed not to fabricate stock values. If actual inventory values do not appear, contact the project owner or Administrator rather than relying on a screenshot or manually entered number.

= 4. Delegate manual

#role("DELEGATE WORKSPACE", luma(230))

The Delegate application is optimized for mobile field work. The bottom navigation provides My Tasks, Visit, Messages, Surgeries, Plan, and Profile. The header displays your role and sign-out control. Use a reliable mobile connection before starting a visit, and keep location permission enabled when your organization requires GPS verification.

== 4.1 My Tasks

My Tasks shows the work assigned to you. Open a task to review the client, scheduled time, and available visit details. The route panel and map area provide geographic context when client coordinates are available. A task assigned to another delegate should not be opened or completed from your account.

If the task list is empty, confirm that you are signed in with the invited Delegate account and contact your Manager if an expected assignment is missing.

== 4.2 Starting a visit and GPS check-in

Open the relevant task and select *Start visit* or the available check-in action. Allow the browser or device to use your location when prompted. FFM records the check-in timestamp and GPS coordinates with the visit record.

Remain at the correct client location when checking in. If GPS is unavailable, move to an area with a clear signal, confirm device location services are enabled, and retry once. Do not invent coordinates or check in on behalf of another person.

== 4.3 Visit report

Complete the visit report while the details are fresh. Record the discussion, outcome, follow-up requirements, and any relevant clinical or operational notes in the provided fields. Keep notes factual, concise, and appropriate for the client record. Select *Save report* and wait for visible success feedback before leaving the screen.

Draft visit notes may be retained locally to help recover from an interrupted session. A local draft is not the same as a confirmed server save. Always look for the saved or success state and retry when the application indicates that persistence did not complete.

== 4.4 Evidence: photo, audio, and signature

Upload only evidence necessary for the assigned visit. Use the photo control for authorized images, audio for relevant voice notes, and signature capture when the client’s approved process requires a signature. Confirm the selected file or recording before submitting it.

#callout("Evidence and consent", [Obtain the required client consent and follow your organization’s retention policy. Do not photograph unrelated people, documents, screens, or personal information. Never upload evidence from a different client or visit.])

Wait for upload success feedback. If an upload fails, retain the original evidence securely, check the connection, and retry through the application. Do not repeatedly submit the same file if the interface already shows success.

== 4.5 GPS check-out and completion

When the visit is finished, select the available check-out action. FFM records the check-out timestamp and GPS coordinates. Confirm that the visit header or status area shows the completed check-in/check-out state before navigating away.

A task should be marked complete only after the report and required evidence are saved. If information is missing, leave the task in the appropriate pending state and tell your Manager what remains.

== 4.6 Messages, Plan, and Surgeries

Use Messages to read operational instructions and send updates to the appropriate team context. In Plan, review submitted visit plans and their status. Status labels such as pending, approved, or rejected may include reviewer and review-time details.

The Surgeries workspace is for the surgery records available to your account. Enter dates, hospital, surgeon, procedure, quotation, invoice, or notes only when the information is verified. Update the record when authorized and avoid changing a record to imply completion before the real event or documentation exists.

== 4.7 Profile and notification preferences

Use Profile to review your signed-in identity and available local notification preferences. Notification preferences affect the device experience; they do not replace checking assigned tasks and direct Manager messages.

= 5. Common problems and safe responses

#table(
  columns: (1.7fr, 3.2fr, 2.5fr),
  inset: 8pt,
  fill: (x, y) => if y == 0 { luma(230) } else { none },
  [*Problem*], [*What to check*], [*When to contact support*],
  [Cannot sign in], [Internet connection, correct account, invitation, and browser session], [The account is not invited, the role is wrong, or the login repeatedly redirects],
  [Delegate cannot see a task], [Correct account, task date, and Manager assignment], [The Manager confirms the task exists but it is outside your visible list],
  [GPS unavailable], [Device location permission, browser permission, and open-sky signal], [Location remains unavailable after moving and retrying],
  [Evidence upload failed], [File type, connection, storage space, and visible upload status], [The same authorized file fails after a safe retry],
  [Report did not save], [Wait for success feedback and inspect the local draft], [The server remains unavailable or the report is not visible after retry],
  [Stock Review shows login], [Use the external Open stock app link and approved credentials], [The stock app itself cannot authenticate or current stock remains unavailable],
)

= 6. Daily operating checklist

For Managers, begin by reviewing the Dashboard, checking pending tasks, confirming that assignments match the day’s plan, and reviewing important messages. During the day, monitor task status and respond to field updates. Before closing, check incomplete work, review reports, and export only the approved date range when a report is required.

For Delegates, begin by checking My Tasks and the day’s route. Before each visit, confirm the client and scheduled time. During the visit, check in with GPS, complete the report, capture only authorized evidence, and save successfully. At the end, check out, confirm the visit state, and review Messages and Plan for follow-up work.

#callout("Professional record standard", [If it was not observed, verified, or saved, do not represent it as complete. FFM is an operational record, so accuracy is more important than speed.])

= 7. Support and escalation

Use the FFM Manager and Delegate workspaces according to your assigned role. For account invitations, role changes, manager–delegate assignments, account removal, or unresolved stock-app authentication, contact the FFM Administrator or designated project owner. Include the page name, approximate time, task or client reference, and a short description of what happened. Do not send passwords or unnecessary evidence in a support message.

#align(center)[
  #v(1em)
  #text(fill: report-accent, weight: "bold")[FFM · Field Force Management]
  #v(0.4em)
  #text(size: 9pt, fill: luma(90))[Manager and Delegate operations only · Administrator procedures intentionally excluded]
]
