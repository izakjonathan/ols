# Ølands Service System v1

Cloned from the Nordic Auto Care system.

Customer site: `/`
Backend routes: `/admin`, `/backend`, `/backend-home`, `/backend-start`
Version check: `/version`

Prototype backend PIN: `2026`

Notes:
- The full customer booking flow and backend order/invoice/service/company modules are preserved.
- Branding has been changed to Ølands Service.
- Default phone number is 26848789.
- Services/packages are still the cloned starter data and can be changed in the backend Services module.
- Deployment metadata is set for Vercel with Node 24.x and npm 10.9.4 downgrade before npm ci.


## v2 Supabase support

This version adds Supabase support without requiring a new Supabase project.

The system still works locally with browser localStorage if Supabase environment variables are not set. When Supabase is configured, the following are synced to Supabase:

- customer orders
- invoices
- services/packages/add-ons
- company information

### Supabase setup

1. Open the Supabase project you already want to use.
2. Go to SQL Editor.
3. Run `SUPABASE_SCHEMA.sql`.
4. In Vercel, add these Environment Variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-SUPABASE-ANON-PUBLIC-KEY
NEXT_PUBLIC_SUPABASE_TABLE=oland_service_state
NEXT_PUBLIC_SUPABASE_STATE_ID=main
```

5. Redeploy.

The backend Backup tab shows Supabase sync status.

### Important prototype note

This uses a simple shared JSON state table. It is good for this current prototype because the backend is still PIN/open-style and the user wants to reuse an existing Supabase project. Later, the system should be moved to proper separate database tables with authentication before real customer/accounting use.


## v3 lockfile fix

Fixes the Vercel `npm ci can only install packages when package.json and package-lock.json are in sync` error.

The lockfile expected `@types/node` 22.15.30, but package.json had 24.10.3. Node runtime is still set to 24.x as required by Vercel. Only the TypeScript node type package was aligned with the existing lockfile.


## v4 default Vercel deployment

Fixes the hanging deployment by removing the custom Vercel install command that globally installed npm before running npm ci.

This build uses normal Vercel Next.js detection:
- Node 24.x
- npm 11 packageManager
- package-lock kept in sync
- no custom installCommand
- no custom buildCommand

Supabase support from v2/v3 is preserved.


## v5 fast install

Reduces Vercel dependency installation by removing ESLint-related packages and deleting the lockfile so Vercel uses npm install rather than npm ci. Supabase support is unchanged.


## v6 EventOS deployment settings

This build copies the deployment pattern from the EventOS ZIP that deploys quickly:
- npm install instead of npm ci
- no package-lock
- package-lock=false in .npmrc
- Next 16 / React 19.2 stack
- build limited to 1 CPU worker
- Node 24.x kept for Vercel requirement
- Supabase support preserved


## v7 white UI

Replaces the gold accent colour across the customer frontend and backend with white/neutral accents. Functionality, Supabase support, and EventOS deployment settings are unchanged.


## v8 Employee hour control

Adds a backend employee-hours module:
- Admin can create employees.
- Each employee gets a private link: `/employee/[token]`.
- Employee page only allows time entry and does not expose backend access.
- Employees can add date, start time, end time, task name and note.
- Duration is calculated automatically.
- Backend dashboard shows all employee tasks with date, start, end, total time, employee name, task name and note.
- Backend can remove a chosen amount of hours from a chosen employee total with a note.
- Employee/hour data is included in Supabase shared state when Supabase is configured.


## v9 splash logo

Updated the splash screen asset(s) to use the provided Ølands logo image/photo.
Also refreshed the local logo image asset.


## v10 ops/timer/transport update

- Backend intro/KPI block only appears in the first dock menu: Nye.
- Other backend modules no longer show the Order Operations summary block.
- Backend bottom padding increased so content can scroll above the dock.
- Gold accents in CSS/Tailwind utility usage replaced with white/neutral accents.
- Timer module redesigned:
  - total hours dashboard
  - hours per employee
  - tap employee to show task list
  - tap individual task to see full info
- Employee Timekontrol page redesigned:
  - total-hours dashboard
  - compact Gem timer form
  - task list with tap-to-expand details
- Frontend services and copy adjusted for Ølands Service as a transport/logistics company.
