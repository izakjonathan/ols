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


## v11 button/style fix

- Restored correct rounded pill styling for all gold-button/outline-button elements after the white-accent conversion.
- Kept white/neutral design, no gold accent utilities.
- Migrates old car-care service catalogue from existing local/Supabase state to the new transport/logistics catalogue.
- Replaced remaining visible bil/car wording in frontend/draft/order summaries with opgave/task wording.
- Production build tested successfully.


## v12 timer dashboard

- Timer top section now shows total hours first.
- Employee names with total hours appear directly under the total.
- Tapping total hours opens all tasks with employee name, hours, and task name.
- Tapping an employee opens only that employee's tasks.
- Tapping a task opens full task info.
- Removed Medarbejdere/Opgaver count cards.
- Removed helper texts.
- Medarbejderdashboard is collapsible and collapsed by default.
- Copy/deactivate buttons sit next to each other.
- Copy link alert now only says "Link kopieret".
- Production build tested successfully.


## v13 timer scale fix

- Removed outer wrapping card around the Timer top dashboard.
- Removed outer wrapping card around the collapsed Medarbejderdashboard toggle.
- Reduced Timer spacing and padding.
- Compact employee management cards inside the collapsed dashboard.
- Made Kopiér link / Deaktiver buttons smaller so they stay next to each other on mobile.
- Truncated long employee token paths to avoid horizontal overflow.
- Production build tested successfully.


## v14 timer employee card fix

- Removed the remaining outer bordered wrapper from the expanded Medarbejderdashboard content.
- Removed long visible employee token paths from cards so they do not stretch the layout.
- Resized employee cards and action buttons for mobile.
- Kept Kopiér link and Deaktiver side by side.
- Production build tested successfully.


## v15 outer border / dock clearance

- Removed the most outer backend module border/background (`admin-shell`) that sat closest to the screen edges.
- Backend module content now has large safe bottom spacing so the final content can scroll fully above the fixed dock and iOS browser bar.
- Production build tested successfully.


## v16 brand assets

- Splash screen replaced with uploaded image 1.
- Home Screen icon / favicon assets regenerated from uploaded image 2.
- Top-left navigation logo replaced with uploaded image 3.
- v15 backend outer border and dock-clearance fixes preserved.


## v17 backend login / fixed header

- Removed "Beskyttet backend" text.
- Removed backend login explanatory text.
- Removed bordered panel around backend login element.
- Reduced top negative space on backend login screen.
- Header changed from sticky to fixed so it remains visible while scrolling.
- Added content top padding to avoid fixed-header overlap.
- Production build tested successfully.


## v18 backend helper text removal

Removed selected helper/explanation text from backend modules:
- Order Operations intro description
- Nye module helper text
- Kalender module helper text
- Færdige module helper text
- Firma module helper text

Production build tested successfully.


## v19 Timekontrol input scale fix

- Fixed the Date / Start / Slut inputs in employee Timekontrol.
- The three inputs now use a compact mobile-safe class so they fit on one line without overlapping.
- Production build tested successfully.


## v20 frontend CTA / moving quote

Added three call-to-action modules on the customer site:
- Ring til Øland Service
- Bliv ringet op af Øland Service
- Flytte tilbud

The moving quote form follows the structure of a Danish moving quote request:
contact details, from/to address, floor/elevator, moving date, packing, m2, move type, storage and comments.

Callback and moving quote submissions create new backend orders.
Production build tested successfully.


## v23 frontend redo

- Landing section fills first screen and only shows the landing statement plus secondary statement.
- Removed Kontakt os / Book pills under landing.
- Nav links are text-only, smaller, no pill borders, Services text used.
- Header is solid black to the top safe area and has no white bottom border.
- CTA pills: call link, callback popup, collapsible free moving quote.
- Site background forced black.
- Contact footer moved clear of floating current-request pill.
- Booking date/time and moving date inputs use mobile-safe scaling.
- Kundeinformation is a single card, not a card inside a card.


## v24 frontend tight cards / scale

- Landing title and subtitle made smaller with tighter letter spacing.
- "Kvalitet · Omhu · Tillid" forced to one line.
- Removed landing contact/book pills.
- Bliv ringet op and Gratis flyttetilbud are expandable cards, not normal standalone forms.
- Replaced circled +/− card toggles with chevron-style indicators.
- Changed booking task card title to "Send forespørgsel".
- Changed Kunde/Kundeinformation copy to Registrer/Kundeinformation.
- Tightened line/letter spacing on booking cards and add-task button.
- Hardened Flyttedato and Dato/Tid mobile input scaling.
- Production build tested successfully.


## v25 typography and spacing pass

- Added a final typography/spacing system layer in CSS.
- Tightened excessive letter spacing across labels, buttons, nav, cards, and headings.
- Normalized panel radius/padding and form control sizing.
- Refined landing title/subtitle scale and spacing.
- Made CTA cards, booking cards, package cards, check rows, and footer more consistent.
- Hardened date/time and moving-date input scale again for mobile.
- Reduced vertical gaps between frontend sections.
- Reworked CarEditor markup for cleaner spacing and more consistent mobile layout.
- Production build tested successfully.


## v26 full layout / backend / employee cleanup

- Ring CTA changed from a white pill to a matching CTA card without chevron.
- Frontend vertical rhythm tightened across CTA, booking, packages and footer.
- Added a single final v26 typography/layout CSS layer after removing duplicate v24/v25 override blocks.
- Removed unused qualities constant and empty backend helper paragraphs.
- Added backend-wide layout/typography rules for module headings, cards, summaries, dock buttons and form controls.
- Added employee-page typography/spacing rules.
- Hardened Dato/Tid and Flyttedato scaling again.
- Reduced excessive card, button, label, package and checkbox spacing.
- Site background remains black.


## v27 professional layout cleanup

- Ring CTA now matches the other CTA cards, without chevron/expand behavior.
- Frontend card hierarchy reduced: less shouting, smaller headings, tighter gaps.
- Floating request pill reduced so it is less disruptive.
- Added more clearance before Services and footer content.
- Backend module typography/spacing tightened.
- Employee page typography/spacing tightened.
- Removed old v26 final CSS layer and replaced it with one v27 layer.
- Date/time and Flyttedato mobile scaling hardened again.
- Production build tested successfully.


## v28 CTA spacing / customer type

- Removed CTA helper texts: Ring, Kontakt, Flytning.
- Increased spacing between CTA cards.
- Matched spacing between CTAs and the Forespørgsel section.
- Changed Kundeinformation Type field from text input to Privat/Erhverv dropdown.
- Production build tested successfully.


## v29 full-screen frontend sections

- Removed fixed/collapsible Aktuel forespørgsel card completely.
- Landing statement changed to four-line structure:
  TRANSPORT / OG LOGISTIK / I SIKRE / HÆNDER.
- Increased landing statement size.
- Added downward chevron in circle at bottom of landing, services and CTA/booking sections.
- Added full-height Services overview section under landing with placeholder copy.
- Made Kontakt/CTA section full viewport height.
- Made Forespørgsel section full viewport height.
- Added smooth scrolling and vertical scroll snap to exact full-screen sections.
- Production build tested successfully.


## v30 chevrons / combined section

- Reduced landing header size and font weight.
- Centered all section chevron symbols inside their circles.
- Added active-section tracking so chevrons rotate upward on later sections and scroll back to the previous section.
- Combined the old CTA section and booking/forespørgsel section into one full-screen Action section.
- Kept smooth scroll and scroll snap between full-screen sections.
- Production build tested successfully.


## v31 corrected chevron behavior

- Bottom chevrons always point down and scroll to the section below.
- Top chevrons on sections after landing point up and scroll to the section above.
- Top chevrons are positioned below the fixed nav bar, not behind it.
- Removed unused active-section chevron switching logic.
- Kept smooth scrolling and scroll snap.
- Production build tested successfully.


## v32 section position / visibility fix

- Removed frontend pt-24 wrapper offset that caused previous-section chevrons to appear in the next viewport.
- Snap sections now use exact 100svh height.
- Added safe-area-aware top/bottom padding inside sections.
- Top chevrons are positioned below the fixed nav.
- Bottom chevrons are positioned above iPhone browser controls.
- Section content can internally scroll if expanded content becomes too tall.
- Smooth scroll and snap behavior preserved.
- Production build tested successfully.


## v33 smooth snap / chevron consistency / cleanup

- Added manual wheel/touch/keyboard smooth scroll controller for frontend snap sections.
- Manual scrolling now moves smoothly to the next/previous exact full-screen section instead of only anchors being smooth.
- Internal scroll areas still work when expanded forms/content are taller than the viewport.
- Unified all section chevron positions using shared CSS variables.
- Top chevrons now have the same top distance on all sections.
- Bottom chevrons now have the same bottom distance on all sections.
- Removed duplicate v29/v30/v31/v32 snap/chevron CSS layers and replaced them with one v33 layer.
- Preserved smooth scroll, snap scrolling, safe-area handling and black background.
- Production build tested successfully.


## v34 chevron edge spacing

- Replaced the v33 section/chevron CSS layer with a v34 layer.
- Added one shared `--chevron-edge-gap` value.
- Bottom chevrons now sit close to the bottom of the viewport using that gap.
- Top chevrons now sit the same gap below the fixed navbar.
- Top and bottom positions are consistent across every section.
- Smooth manual snapping from v33 is preserved.
- Production build tested successfully.


## v35 scroll-position root fix

Root cause found:
- An older global CSS rule was still active: `section[id] { scroll-margin-top: 5.4rem; }`.
- Browser anchor navigation and `scrollIntoView()` respect `scroll-margin-top`.
- That meant each full-screen snap section stopped 5.4rem too low.
- Because the active section was shifted down, the previous section's bottom chevron remained visible under the navbar and the current section's top chevron was pushed too far down.

Fix:
- Changed `section[id]` scroll margin to `0`.
- Added final hard overrides for `section[id]`, `.snap-section`, and `[data-snap-section]`.
- Kept `scroll-padding-top: 0`.
- Added section containment/isolation to prevent visual bleed between neighboring snap sections.
- Production build tested successfully.


## v36 labelled CSS chevrons

- Replaced circular chevron buttons with CSS chevron symbols using the requested `.chevron::before` pattern.
- Removed the circle/border/background around section chevrons.
- Added muted destination labels:
  - label under top chevrons
  - label above bottom chevrons
- Labels are small, bold, caps and letter-spaced.
- Existing smooth snap and v35 scroll-position root fix are preserved.
- Production build tested successfully.


## v37 global CSS cleanup / smaller chevron labels

- Rewrote `app/globals.css` into a single clean stylesheet.
- Removed old duplicated v27/v28/v34/v35/v36 override layers.
- Removed unused/legacy selectors from earlier layout versions.
- Kept only the current active custom classes used by the app.
- Kept smooth snap, safe-area handling, black background, backend styles and employee page styles.
- Changed chevron section-label styling to match the small button typography used by `+ Tilføj opgave`, while keeping the current muted grey color.
- Production build tested successfully.


## v38 splash scale fix

- Fixed the splash screen logo scaling after the v37 CSS cleanup.
- Increased splash logo size on mobile and desktop.
- Kept the logo centered on the black splash screen.
- Production build tested successfully.


## v39 splash actual-logo fix

Root cause:
- The splash screen was using the full portrait splash image as a `fill`/`object-cover` image.
- That source image contains a large black canvas around the logo, so CSS scaling changed the canvas rather than reliably controlling the logo size.
- The v38 CSS also targeted `.splash-screen img`, but Next/Image `fill` applies absolute positioning and object-cover styles that fought the intended scaling.

Fix:
- Replaced the splash image source with the cropped `oland-service-logo.png` logo asset.
- Removed `fill`/`object-cover` for the splash image.
- Added a dedicated `.splash-logo` class with explicit width and mobile sizing.
- Splash remains centered on the black screen.
- Production build tested successfully.


## v40 reduced heading weight

- Reduced `.tight-card-title` font weight, affecting all card headings using that shared style, including `BLIV RINGET OP`.
- Removed Tailwind `font-black` from every heading using `.tight-card-title` so the shared CSS controls all matching instances.
- Reduced `.section-title` font weight, affecting `HVAD ØLAND SERVICE HJÆLPER MED` and any future section title using that style.
- Added a final v40 CSS guard so these shared styles win consistently.
- Production build tested successfully.


## v41 backend layout pass

- Vertically centered the backend login screen.
- Added one consistent backend module title/header at the top of every backend module.
- Changed backend/invoice information cards to a consistent two-column stat grid.
- Made submitted/new orders in `Nye` collapsible by default.
- Reduced nested borders inside submitted order details using a compact new-order detail wrapper.
- Removed duplicate local module titles where the new shared backend header now handles the title.
- Added a backend alignment/typography/spacing pass for cards, stats, titles, and dock clearance.
- Production build tested successfully.


## v42 backend title spacing

- Removed `BACKEND` eyebrow text above each backend module title.
- Removed the module-level `Kundeside` pill next to backend module titles.
- Kept the top navigation `Kundeside` link.
- Set all backend module titles to start at a consistent distance below the fixed nav.
- Reduced backend module title font size and weight.
- Production build tested successfully.


## v43 backend consolidation

- Removed `pt-6` from the backend JSX section and replaced it with `backend-screen`.
- Consolidated backend CSS into one v43 backend section in `app/globals.css`.
- Reduced `.admin-screen-title` size and weight further.
- Applied one consistent backend card spacing system.
- Kept `Nye` and `Faktura` stat cards in a shared two-column `admin-stat-grid`.
- Added global backend card and info-card classes for consistent two-column info group styling.
- Reduced nested borders globally across submitted orders, calendar details, completed order details, service details, invoice line cards and order details.
- Increased dock/bottom clearance so backend bottom content is not hidden by the dock/mobile browser.
- Checked backend modules: Nye, Kalender, Faktura, Færdige, Ydelser, Firma, Timer and Backup.
- Production build tested successfully.


## v44 backend top spacing

- Moved backend content closer to the fixed top nav globally.
- Uses one shared backend top offset for all backend modules.
- Applies to Nye, Kalender, Faktura, Færdige, Ydelser, Firma, Timer and Backup.
- Tightened the spacing below module titles and below stat grids slightly.
- Preserved v43 backend consolidation and dock clearance.
- Production build tested successfully.
