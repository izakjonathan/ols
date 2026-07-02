# Øland Service System — v48 Temporary Final Test Build

This ZIP is the temporary final build for testing. The feature set is frozen for this pass so the next round of work can be based on real test results.

## Routes

- Customer site: `/`
- Backend/admin: `/admin`, `/backend`, `/backend-home`, `/backend-start`
- Employee hour link: `/employee/[token]`
- Version check: `/version`

## Backend PIN

Prototype PIN:

```txt
2026
```

## Deploy to Vercel

1. Upload/commit this ZIP contents as the project root.
2. Vercel should use the included settings:
   - Node: `24.x`
   - Install: `npm install --no-audit --no-fund --progress=false`
   - Build: `npm run build`
3. Add Supabase variables if you want shared persistence.
4. Redeploy after changing environment variables.

No `package-lock.json` is included on purpose.

## Supabase setup

Run `SUPABASE_SCHEMA.sql` in the SQL editor of the Supabase project you want to reuse.

Add these in Vercel Project Settings > Environment Variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-SUPABASE-ANON-PUBLIC-KEY
NEXT_PUBLIC_SUPABASE_TABLE=oland_service_state
NEXT_PUBLIC_SUPABASE_STATE_ID=main
```

If Supabase is not configured, the system falls back to browser local storage.

## What is included

Frontend:
- full-screen landing sections
- services overview placeholder section
- call CTA
- callback CTA
- free moving quote CTA
- request flow
- dark Øland theme

Backend:
- login screen
- Nye
- Kalender
- Faktura
- Færdige
- Ydelser
- Firma
- Timer
- Backup/import

Employee link:
- employee-specific time entry page
- start/end/task/note entry
- dashboard totals in backend
- manual hour removal in backend

## Test checklist

### Frontend

- Open `/` on iPhone Safari.
- Check splash screen scale.
- Scroll/snapping through sections.
- Test top nav links.
- Test chevrons up/down.
- Tap `Ring til Øland Service` and confirm it opens phone prompt.
- Open `Bliv ringet op` and submit test info.
- Open `Gratis flyttetilbud` and fill test fields.
- Add an extra task.
- Add customer information.
- Submit request.
- Refresh page and check request remains if Supabase/local storage is active.

### Backend

- Open `/admin`.
- Login with PIN `2026`.
- Check each module starts close to top nav with consistent spacing.
- In `Nye`, open a submitted request card.
- Edit request fields.
- Accept/move order.
- Check order appears in `Kalender`.
- Create/send invoice draft in `Faktura`.
- Move/check completed order in `Færdige`.
- Edit services in `Ydelser`.
- Edit company details in `Firma`.
- Create employee in `Timer`.
- Use Backup export/import.

### Employee link

- Copy employee link from backend.
- Open it on a separate device/browser.
- Add hours.
- Add note/task name.
- Refresh page and check persistence.
- Confirm backend totals update.
- Test manual hour removal.

### Supabase

- Confirm backend Backup tab says Supabase is saved/synced.
- Test on two devices.
- Submit request on one device.
- Open backend on another device and confirm data appears.
- Refresh both devices.

## Temporary limitations

- This is still a prototype/open backend with PIN protection, not real authentication.
- Supabase uses one shared JSON state row for simplicity.
- Public anon read/write policies are prototype-only.
- Uploaded images are currently form inputs only; file storage handling should be defined in a later pass if needed.
- Invoice sending uses mailto-style workflow, not automated email delivery.

## Baseline for next pass

Use this file as the testing baseline:

```txt
oland-service-system-v48-temporary-final-test-build.zip
```


## v49 frontend CSS audit / layout fix

Root cause found:
- v47 appended a second frontend `:root` and a large override layer after the consolidated CSS.
- That created contradictory spacing variables and section rules.
- The action section used `h-full` + internal padding/max-height overrides, causing top chevron labels to collide visually with the first CTA card.
- Old Tailwind uppercase/tracking utilities were still fighting the Apple-style typography in some frontend headings.

Fix:
- Removed the conflicting v47 override layer.
- Added one clean v49 frontend layout layer.
- Full-screen sections now reserve fixed zones for navbar, chevrons and browser bottom area.
- Section content is centered only in the safe middle zone.
- Top/bottom chevrons sit outside content flow and no longer overlap cards.
- Frontend CTA cards, services cards, request forms and prices section now share one spacing/typography rhythm.
- Backend and employee spacing from v48 remains preserved.
- Production build tested successfully.


## v50 frontend stable layout fix

Problem fixed:
- Full-screen snap sections with `overflow:hidden` and internal max-height scrolling caused price content to be clipped.
- Chevron safe zones created large black dead areas that looked like black squares behind chevrons.
- The price section has more content than one mobile viewport, so forcing it into one hidden full-screen section was the wrong approach.

Fix:
- Removed the v49 frontend layout layer.
- Added a simpler v50 frontend section model.
- Frontend sections use normal document flow with `min-height: 100svh` instead of clipping content.
- Price section now scrolls normally and can show all services/packages/add-ons.
- Chevrons are transparent small controls outside the content flow, with no box/background.
- CTA, services, request and prices typography/spacing are normalized.
- Backend and employee page behavior is preserved.
- Production build tested successfully.


## v51 compact navbar

- Reduced the global `--nav-h` token.
- Made the fixed navbar height fit the logo/nav text with small vertical margins.
- Updated mobile nav height and logo sizing.
- Preserved v50 stable frontend layout behavior.
- Production build tested successfully.


## v52 baseline lock

This build keeps the Claude CSS cleanup as the new baseline and only makes small baseline-lock changes:

- Updated `/version` so it correctly shows `Øland Service v52`.
- Reviewed previously suspected unused selectors:
  - `.choice-card` is still used in the app markup, so it was kept.
  - `.chevron-toggle` is still used in the app markup, so it was kept.
- Added comments in `app/globals.css` explaining the `:root` structure:
  - the base `:root` is the main design-token control panel.
  - responsive `:root` blocks only override specific sizing/spacing tokens for tablet/desktop, short mobile screens, and mobile.
- Did not add a new styling override layer.
- Future changes should stay small and targeted against this baseline.
