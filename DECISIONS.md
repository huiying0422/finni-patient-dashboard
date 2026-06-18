# Architecture & Design Decisions

This document records **why** each technical choice was made — alternatives considered, rationale, and scope boundaries. For project overview, design principles, setup, data model, and module map, see [README.md](./README.md).

**Presenting live?** Start with [Stack at a glance](#stack-at-a-glance-demo-summary), then [Scope capstone](#scope-and-future-work-capstone), then [Design token extraction](#design-token-extraction-finni-health-branding) if asked about UI/UX.

---

## Stack at a glance (demo summary)

One-line answers for each row in the [README stack table](./README.md#stack). Full phase detail lives in the sections below.

| Layer | Choice | Alternatives | Why this one (say this) |
|-------|--------|--------------|-------------------------|
| **UI** | React 19 + TypeScript + Vite | Next.js, CRA, plain JS | Fast dev server, static deploy, strict types — no SSR needed for a Firebase SPA dashboard. |
| **Components** | shadcn/ui + Radix (Nova preset) | MUI, Chakra, headless-only | Accessible Radix primitives, components live in our repo (no black box), Nova is a clean baseline we theme to Finni. |
| **Styling** | Tailwind CSS v4 + CSS variables | CSS Modules, styled-components | Pairs with shadcn; tokens in `src/index.css` keep brand colors global without scattered hex values. |
| **Forms** | React Hook Form + Zod | Formik, Yup-only, native forms | RHF handles form state; `zodResolver` shares the **same schema** the service layer uses before Firestore writes. |
| **Database** | Firebase Firestore (modular SDK) | Supabase, REST + Postgres, mock API | Real-time `onSnapshot` for live lists; env-based config; `firestore.rules` sketch ready for auth scoping. |
| **Hosting** | Firebase Hosting | Vercel, Netlify, Cloudflare Pages | Same vendor as Firestore; SPA rewrites in `firebase.json`; no cross-platform env/referrer debugging. |
| **Toasts** | Sonner | react-hot-toast, react-toastify | Lightweight pop-up feedback after create/update/delete — confirms success or surfaces server errors without blocking the UI. |

### Sonner (Toasts) — what it is

**Toasts** are small, temporary notifications (top-right) that confirm an action or show an error. **Sonner** is the library; we mount one `<Toaster />` in `App.tsx` and call `toast.success()` / `toast.error()` from add, edit, and delete flows. Inline form errors stay on the form; toasts handle post-save feedback.

**Decision:** Use Sonner for CRUD feedback.

**Alternatives considered:** react-hot-toast, react-toastify, browser `alert()`, inline-only messages.

**Rationale:** Sonner has a minimal API, works well with shadcn styling, and keeps validation errors separate from operational confirmations — a common dashboard pattern.

### Firebase Firestore — why not something else

**Decision:** Firestore as the sole backend, accessed only through `src/services/patients.ts`.

**Alternatives considered:** Supabase Postgres, a custom REST API, in-memory mock data.

**Rationale:** Firestore gives real-time listeners out of the box, Firebase Console is quick to stand up for a take-home, and security rules provide a credible path to provider-scoped access in production. Hosting on **Firebase Hosting** keeps database, auth (future), and static deploy in one project.

### Firebase Hosting — why we deploy here (and not Vercel)

**Decision:** Ship the production build to **Firebase Hosting** (`firebase.json` → `dist/`, `npm run deploy`).

**Alternatives considered:** Vercel (initial deploy target), Netlify, Cloudflare Pages.

**Rationale:** This app is a **Firebase-backed SPA** — Firestore, config, and rules all live in one Google Cloud / Firebase project. Firebase Hosting is the path of least resistance: one console, one CLI, default API-key referrer coverage for `*.web.app` / `*.firebaseapp.com`, and SPA rewrites without extra vendor config.

**Why Vercel was difficult for this project (lessons learned):**

| Issue | What happened | Why Firebase Hosting avoids or simplifies it |
|-------|----------------|-----------------------------------------------|
| **Build-time env vars** | Vite only embeds `VITE_*` at `npm run build`. Vercel builds run on their servers — vars must be set in the Vercel dashboard *before* each deploy. | Local `.env` + `npm run deploy` — same machine that already works for `npm run dev`. |
| **Wrong env names** | Firebase Console uses `apiKey`, `projectId`, etc. We initially set those names on Vercel; the client bundle got empty config. | `.env.example` documents `VITE_FIREBASE_*`; one naming convention end-to-end. |
| **Missing / mistyped keys** | `VITE_FIREBASE_MESSAGING_SENDER_ID` was absent once — build failed with TS/plugin errors after we added validation. | Build runs where `.env` is already validated locally. |
| **API key HTTP referrers** | Google Cloud API key had to explicitly allow `https://*.vercel.app/*` in addition to `localhost`. Easy to miss; causes slow hangs or empty data. | Firebase Hosting domains are in the same ecosystem; referrer setup is simpler for `*.web.app`. |
| **Firestore rules vs repo** | Committed `firestore.rules` is deny-all; **Console** rules must be published separately — true on any host, but Vercel added confusion because the app “worked locally” but not on `*.vercel.app`. | Same rules apply everywhere; Hosting removed the extra variable of a second platform’s deploy pipeline. |
| **Cross-vendor debugging** | Database in Firebase Console, hosting on Vercel, env in a third UI — hard to tell if the bug was code, env, referrers, or rules. | Single project: Firestore + Hosting + env in one place. |

**Takeaway for demos:** For a Vite + Firebase SPA, prefer **Firebase Hosting** (or ensure Vercel has all six `VITE_FIREBASE_*` vars, API referrers for `*.vercel.app`, and published Firestore rules before debugging app code).

### React Hook Form + Zod — why together

**Decision:** RHF for form state; Zod for validation via `zodResolver(patientFormSchema)` in the UI and `patientFormSchema.parse()` in the service.

**Alternatives considered:** Formik, separate TypeScript interfaces without runtime checks, UI-only validation.

**Rationale:** One Zod schema drives TypeScript types (`z.infer`), inline form errors, and the trust boundary before any write — rules cannot drift between UI and database.

---

## Scope and future work capstone

Use this section as your **scope script** in a live demo: what shipped, what we deliberately skipped, and why the architecture still supports adding the rest later.

### What we shipped (demo these)

| Capability | One-line demo line |
|------------|-------------------|
| Full CRUD | Add, view, edit, and delete patients with validation at every step. |
| Live list | Firestore `onSnapshot` — list updates automatically; **Refresh** re-subscribes on demand. |
| Pagination | 20 patients per page (client-side) — scales UI with large demo datasets. |
| Search + filter | Client-side derived state; source data never mutated. |
| Data-driven form | New fields = config in `patientFields.ts` + schema entry, not a form rewrite. |
| Service layer | Components never touch Firebase directly; Zod runs before every write. |
| Compliance hooks | `createdAt`, `updatedAt`, `lastEditedBy`; deny-by-default rules sketch in-repo. |
| Finni branding | Tokens extracted from public CSS (see [Design token extraction](#design-token-extraction-finni-health-branding)). |

**Scope discipline (say this):** We shipped a complete provider CRUD workflow first. Auth, billing, intake portals, and third-party address APIs are parked — not forgotten — because the layered architecture lets them land incrementally without rewriting what works.

### Parked features — what to say when asked

Each item below is **intentionally out of MVP scope**. The third column is your answer to “could you add that?”

| Feature | Why parked now | How the architecture supports it later |
|---------|----------------|----------------------------------------|
| **Provider auth + multi-tenant isolation** | No Firebase Auth in take-home; dev uses open rules | `providerId` field + commented rule in `firestore.rules`; swap `PLACEHOLDER_EDITOR_ID` for `request.auth.uid` |
| **Full audit logging** | MVP writes `lastEditedBy` + timestamps only | Service layer is the single write path — append-only log collection hooks in `patients.ts` |
| **BAA-backed address verification** | Third-party APIs need PHI review and a server proxy | Validation already in Zod; proxy endpoint replaces normalization-only path |
| **Family caregiver intake portal** | Separate product surface | Same `patientFormSchema` + service layer; new route and auth role |
| **Configurable intake questionnaires** | Dynamic forms are a large scope item | Data-driven `patientFields` pattern extends to questionnaire config |
| **E-signature and consent** | Legal workflow + storage | Patient record + audit metadata already exist; new collection + UI |
| **Reminder emails and texts** | Requires messaging infra + consent | Patient contact fields and status enum ready for trigger rules |
| **Scheduling and visit history** | Calendar is its own domain | Patient `id` as foreign key; new subcollection under patient |
| **Insurance capture and billing** | Payer data expands PHI surface | Schema extension + service validation; no refactor of list/form shell |
| **Status change history** | MVP shows current status only | Status enum + `updatedAt`/`lastEditedBy`; append transition log on `updatePatient` |
| **Internationalized address** | US-only validation for MVP | `addressSchema` is isolated; swap or extend without touching form mapper |
| **Role-based access** | Depends on auth | Rules sketch + `lastEditedBy`; UI gates by role once Auth lands |

For the README’s incremental-framing summary, see [Future work](./README.md#future-work).

---

## Design token extraction (Finni Health branding)

How Finni’s visual identity was mapped into this dashboard **using public CSS sources only** — no brand kit provided.

### Step 1 — Confirm the font

Finni’s marketing site loads **Outfit** from Google Fonts (weights 300–700). The font family name in the stylesheet URL is the ground truth:

```bash
curl -s "https://fonts.googleapis.com/css?family=Outfit:300,400,500,600,700" | head -c 300
```

We set `--font-sans: "Outfit", sans-serif` in `src/index.css` and load the font in `index.html`.

### Step 2 — Extract colors from the Webflow stylesheet

Finni’s public marketing site runs on **Webflow**. Its shared CSS file contains every hex the site actually uses:

```bash
curl -s "https://cdn.prod.website-files.com/6297d5d89ac9c5b4308579e1/css/finnihealth.webflow.shared.5f902c756.css" \
  | grep -oE '#[0-9a-fA-F]{6}' \
  | sort | uniq -c | sort -rn | head -20
```

Sort by frequency to see which colors dominate — e.g. `#B7A692` (warm taupe borders) appears more often than accent oranges, so it belongs in the token set as a brand neutral, not an afterthought.

To also catch `rgba()` values:

```bash
curl -s "https://cdn.prod.website-files.com/6297d5d89ac9c5b4308579e1/css/finnihealth.webflow.shared.5f902c756.css" \
  | grep -oiE '#[0-9a-f]{3,6}|rgba?\([0-9, .]+\)' \
  | sort | uniq -c | sort -rn | head -30
```

### Step 3 — Filter platform noise

Raw CSS extraction includes **framework defaults**, not just brand choices. Example: `#3898EC` is Webflow’s default accent blue — it appears in the dump but not in Finni’s visible brand language. **Judgment step:** keep colors that match the marketing site’s look; drop boilerplate.

### Step 4 — Map to dashboard tokens

Reconciled hex values were mapped to shadcn CSS variables in `src/index.css`:

| Token | Hex | Role |
|-------|-----|------|
| Primary | `#ED762F` | Buttons, accents |
| Background | `#FBF7F0` | Page background |
| Card | `#FFFFFF` | Card surfaces |
| Foreground | `#141414` | Body text |
| Muted foreground | `#758696` | Secondary text |
| Border / input | `#B7A692` | Borders, inputs |
| Secondary / accent | `#D1BCE7` | Soft purple surfaces |

Layout cues from the marketing site: **pill buttons** (`rounded-full`), **~16px card radius** (`--radius: 1rem`). Status badge colors in `src/lib/patientFormat.ts` use the same palette with contrast tuned per lifecycle stage.

**Decision:** Extract tokens from public Webflow CSS + Google Fonts; implement as CSS variables.

**Alternatives considered:** DevTools eyedropper per element; generic health-tech palette; hardcoded hex in components.

**Rationale:** Public stylesheets give exact hex and font names reproducibly; CSS variables keep components token-driven; manual filtering removes platform noise that automated extraction cannot distinguish from brand.

### Brand logo assets

Finni’s public Webflow CDN hosts the brand files used in this dashboard:

| Asset | Source URL | Usage |
|-------|------------|-------|
| Fox icon (`public/finni-fox.png`) | `logo512.png` on their CDN | Favicon and header mascot |
| Wordmark (`public/finni-logo.svg`) | `Logo.svg` in site nav | Header wordmark |

**How to find them yourself:**

```bash
# List image URLs from the marketing homepage
curl -sL "https://www.finnihealth.com" \
  | grep -oiE 'https://[^"'\'' ]+\.(svg|png|webp)' \
  | sort -u
```

The nav `<img>` tag points at `Logo.svg`; the favicon / apple-touch icon uses `logo512.png` (fox mascot).

---

## Documentation audit index (Phase 8)

Cross-check of codebase vs. this document:

| Choice (as implemented) | DECISIONS entry |
|-------------------------|-----------------|
| React 19 + Vite + TypeScript | [Application stack](#application-stack-react--vite--typescript) |
| Tailwind CSS v4 | [Tailwind CSS v4](#tailwind-css-v4) |
| shadcn/ui + Radix (Nova preset) | Phase 2 — Component library |
| Zod schemas + `z.infer` | Phase 1 — Zod schemas |
| Status enum | Phase 1 — Status as Zod enum |
| Firestore service layer (`patients.ts`) | Phase 1 — Dedicated Firestore service layer |
| Firebase env config | Phase 1 — Firebase config via environment variables |
| Firebase Hosting deploy | [Firebase Hosting](#firebase-hosting--why-we-deploy-here-and-not-vercel) |
| Firestore dev rules posture | Phase 1 — Firestore security rules for development |
| Finni theming (Outfit, tokens) | [Design token extraction](#design-token-extraction-finni-health-branding) |
| `usePatients` hook + explicit UI states | Phase 2 — List view and usePatients hook |
| Status badge colors | Phase 2 — List view (badge table) |
| Data-driven `patientFields` + RHF + Zod | Phase 3 — Add form |
| Address line2, autofill, normalization | Phase 3 — Address |
| `omitUndefined` for Firestore writes | Phase 3 — Firestore writes omit undefined |
| Sheet detail + reused form + AlertDialog delete | Phase 4 — Detail, edit, delete |
| Search/filter derived state | Phase 5 — Polish |
| `onSnapshot` live subscription | Phase 5 — Polish |
| Sonner toasts | [Stack at a glance — Sonner](#sonner-toasts--what-it-is) |
| Responsive mobile cards | Phase 5 — Polish |
| Compliance metadata + rules sketch + README | Phase 6 — Compliance touches |
| Repo hygiene / production build | Phase 7 — Deploy and hygiene |
| Dual-layer validation (UI + service) | [Dual-layer validation](#dual-layer-validation-ui-and-service) |
| `@/` path alias | [Path alias](#path-alias-) |
| Pagination (20 per page) | Phase 5 — Polish |
| Manual refresh button | Phase 5 — Polish |

---

## Phase 8: Documentation audit additions

### Application stack (React + Vite + TypeScript)

**Decision:** Build the dashboard as a client-rendered SPA using **React 19**, **Vite 8**, and **TypeScript 6** with strict typing throughout.

**Alternatives considered:** Next.js (SSR/SSG), Create React App (deprecated), plain JavaScript without types.

**Rationale:** Vite gives fast local dev and a simple static deploy story appropriate for a Firebase-backed SPA. TypeScript catches schema and component mismatches at compile time. React 19 is the current stable baseline for hooks-based UI. No server rendering is needed for this authenticated-dashboard pattern in the take-home scope.

### Tailwind CSS v4

**Decision:** Use **Tailwind CSS v4** via the `@tailwindcss/vite` plugin, with shadcn CSS variables for theming in `src/index.css`.

**Alternatives considered:** CSS Modules, styled-components, plain CSS, Tailwind v3 with PostCSS.

**Rationale:** Tailwind pairs naturally with shadcn/ui and keeps styling colocated with components. v4's Vite plugin removes PostCSS boilerplate. Design tokens live in CSS variables so Finni brand colors apply globally without one-off hex values in components.

### Dual-layer validation (UI and service)

**Decision:** Validate patient data twice: **`zodResolver(patientFormSchema)`** in the form (inline errors) and **`patientFormSchema.parse()`** in the service layer before every Firestore write.

**Alternatives considered:** UI-only validation, service-only validation, separate TypeScript interfaces without runtime checks.

**Rationale:** UI validation gives immediate feedback; service validation is the trust boundary — Firestore writes must not depend on the client having run the form. One Zod schema powers both, so rules cannot drift.

### Path alias (`@/`)

**Decision:** Map **`@/*`** to **`src/*`** in both `tsconfig.app.json` and `vite.config.ts`.

**Alternatives considered:** Relative imports only, other alias prefixes (`~`, `#`).

**Rationale:** Matches shadcn/ui conventions and keeps imports stable when moving files. Avoids long `../../` paths across components, hooks, lib, and services.

### Demo data

**Decision:** Populate demo data through the **Add Patient UI** or existing Firestore records. The temporary seed button and `seedPatients()` utility were removed after Firebase Hosting migration.

**Alternatives considered:** Firestore seed script, Firebase Emulator import, fixture JSON loaded on startup, Faker-based bulk seed in the UI.

**Rationale:** Bulk seeding added bundle weight (`@faker-js/faker`) and masked production deploy issues during the Vercel phase. Manual entry and real Firestore data better validate the full CRUD path on the hosted URL.

---

## Phase 1: Data model and service layer

### Zod schemas as the single source of truth

We defined `addressSchema` and `patientFormSchema` in `src/lib/types.ts` using Zod. `PatientFormValues` is inferred with `z.infer`, and the full `Patient` type extends that with Firestore metadata (`id`, timestamps, optional `providerId`, `lastEditedBy`).

**Why:** One schema drives both runtime validation and TypeScript types, so form values and Firestore writes cannot drift apart. Validation runs at the service boundary before any database write.

### Status as a Zod enum

Patient status is restricted to `"Inquiry" | "Onboarding" | "Active" | "Churned"` via `z.enum`, not a free-form string.

**Why:** Status represents fixed lifecycle stages that drive UI badges, filters, and future workflow logic. Enum validation rejects bad data at runtime and gives TypeScript an exact union type.

### Dedicated Firestore service layer

All Firestore access lives in `src/services/patients.ts`. UI components and hooks never import Firestore SDK functions directly.

**Why:** Keeps persistence logic in one place, makes testing and refactors easier, and ensures Zod validation always runs before writes.

### Firebase config via environment variables

Firebase credentials are loaded from `.env` using Vite's `VITE_*` prefix and embedded at build time via `vite.config.ts` → `__FIREBASE_CONFIG__`. A committed `.env.example` documents required keys; real secrets stay gitignored.

**Why:** Keeps credentials out of source control while allowing each developer to point at their own Firebase project. For **Firebase Hosting**, run `npm run build` with `.env` present locally (or set the same vars in CI); Vite bakes config into `dist/` — there is no runtime env on the static host.

### Firestore security rules for development

Initial Firebase rules denied all reads/writes (`allow read, write: if false`). We opened rules temporarily in the Firebase Console so unauthenticated client writes succeed during local development and on Firebase Hosting.

**Why:** The app does not yet use Firebase Auth. Production rules should require authentication and scope access to the `patients` collection. Rules must be **published in the Console** — the committed `firestore.rules` file is a sketch only.

---

## Phase 2: UI foundation, theming, and list view

### Component library: Radix UI via shadcn/ui (Nova preset)

We chose **Radix UI** as the underlying component library and initialized shadcn/ui with the **Nova** preset (`radix-nova` style in `components.json`).

**Why:** Radix provides accessible, unstyled primitives. shadcn/ui copies components into the repo (no opaque dependency), and the Nova preset gives a clean, modern baseline that we can theme to match Finni Health branding without fighting the defaults.

### Design tokens and theming

Finni tokens were extracted from public CSS (Webflow stylesheet + Google Fonts). See **[Design token extraction](#design-token-extraction-finni-health-branding)** for the full workflow. Applied values in `src/index.css`:

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#ED762F` | Buttons, accents (white text) |
| Background | `#FBF7F0` | Page background |
| Card | `#FFFFFF` | Card surfaces |
| Foreground | `#141414` | Body text |
| Muted foreground | `#758696` | Secondary text |
| Border | `#B7A692` | Borders and inputs |
| Secondary | `#D1BCE7` | Soft accent surfaces |

Buttons are fully **pill-shaped** (`rounded-full`). Cards use **16px** corner radius (`rounded-2xl`, `--radius: 1rem`).

**Why:** Consistent tokens make the dashboard feel on-brand and keep future components aligned without one-off color values.

### List view and `usePatients` hook

The patient list is rendered by `PatientList` using a `usePatients` hook that subscribes to `subscribePatients` from the service layer.

**Why a hook:** The service returns data; the hook owns UI state (`loading`, `error`, `patients`) via a live Firestore subscription. Components stay presentational and do not duplicate fetch logic.

**Why explicit states:** We render three distinct UI states — loading skeleton, empty state, and error state — instead of a blank screen or generic spinner. This gives users clear feedback and makes edge cases testable.

Status badges use lifecycle-specific colors:

- **Inquiry** — lavender (`#D1BCE7` / `#4A3A54`)
- **Onboarding** — peach (`#FDE7D6` / `#B8480F`)
- **Active** — mint (`#E2F3E7` / `#2E7D3A`)
- **Churned** — gray (`#E6E6E6` / `#758696`)

---

## Phase 3: Add patient form

### Add form: data-driven fields with RHF and Zod

The add-patient flow is built from three pieces:

1. **`src/lib/patientFields.ts`** — a declarative array describing each field (`key`, `label`, `inputType`, optional `options`). Covers name fields, date of birth, status select, and nested address subfields.
2. **`src/components/PatientForm.tsx`** — maps over `patientFields` to render inputs, using **React Hook Form** with **`zodResolver(patientFormSchema)`** for validation aligned with the service layer.
3. **`src/components/AddPatientDialog.tsx`** — shadcn Dialog opened by an "Add patient" pill button in the list header; on valid submit calls `addPatient` and closes.

**Why data-driven fields:** Adding a new field later is a config change in `patientFields.ts` plus the corresponding entry in `patientFormSchema` — not a form rewrite. The mapper handles text, date, and select input types from the config.

**Why RHF + Zod together:** React Hook Form manages form state and inline errors in the UI; Zod (via `zodResolver`) enforces the same rules the service uses on submit. Invalid input (empty name, future DOB, bad ZIP) is blocked before Firestore.

**Why dialog in list header:** The add action lives where users manage the patient list; the live subscription updates the list automatically after create.

### Address: optional line 2, browser autofill, normalization, third-party verification parked for PHI/BAA reasons

We extended the address model with an optional **`line2`** field (apartment, suite, or unit) alongside required street, city, state, and ZIP. **`middleName`** and **`address.line2`** are the only optional fields on the patient form; everything else is required.

**Normalization (Zod transforms, no third-party API):** All string fields are trimmed on submit. State codes are uppercased and validated as exactly two letters. ZIP remains US-format validated. This keeps Firestore data clean without an external geocoding or verification service.

**Browser autofill:** Each address and name field in `patientFields` carries an `autoComplete` token (`given-name`, `address-line1`, `address-line2`, `address-level1`, etc.) passed through to inputs so browsers can offer saved-address autofill — zero dependencies.

**Third-party verification parked:** Services like Google Address Validation or SmartyStreets could standardize addresses further, but they introduce PHI handling and BAA requirements. For this take-home we rely on schema validation + normalization instead.

### Firestore writes omit undefined optional fields

Zod normalization turns empty optional fields (`middleName`, `address.line2`) into `undefined`. Firestore rejects documents containing `undefined` values, so `omitUndefined()` in the service layer strips those keys before `addDoc` / `updateDoc`.

**Why:** Optional form fields should simply be absent from stored documents, not saved as `undefined`. This keeps the schema normalization without breaking Firestore writes.

---

## Phase 4: Detail, edit, and delete

### Detail, edit, delete: one reused form

Each patient row opens a **shadcn Sheet** showing all fields plus `createdAt` and `updatedAt`. Edit mode reuses the same **`PatientForm`** component from add flow, pre-filled via `patientToFormValues()`. Save calls `updatePatient`; delete is guarded by an **AlertDialog** confirm before calling `deletePatient`.

**Why reuse the form:** Add and edit share identical fields, validation rules, and input types. One `PatientForm` mapped from `patientFields` means validation or UI changes apply to both flows automatically — no duplicated markup or diverging Zod rules.

**Why confirm destructive actions:** Deleting a patient is irreversible. An AlertDialog forces an explicit confirmation step so accidental clicks on "Delete patient" cannot silently remove records.

**Why Sheet for detail:** A side panel keeps the list visible in context on desktop and slides over on mobile, which fits a dashboard pattern better than navigating to a separate page for a quick record review.

---

## Phase 5: Polish — search, filter, live updates, toasts

### Polish: search, filter, live updates, toasts

The list layer gained UX improvements:

1. **Search input** — filters by full name as you type.
2. **Status filter pills** — All, Inquiry, Onboarding, Active, Churned.
3. **`onSnapshot` live subscription** — replaces the one-time `listPatients` fetch in `usePatients`.
4. **Refresh button** — re-subscribes to Firestore on demand (useful after connection issues or when verifying hosted deploy).
5. **Pagination** — 20 patients per page (client-side) so large datasets stay scannable.
6. **Sonner toasts** — success and error feedback on create, update, and delete.
7. **Responsive layout** — card list on mobile, table on desktop; improved skeletons and spacing.

**Why derived state for search/filter:** The source `patients` array from Firestore is never mutated. Search query and status filter are separate UI state; `useMemo` derives `filteredPatients` from the source list. Filtering stays instant, predictable, and easy to reset without re-fetching.

**Why `onSnapshot` plus Refresh:** The snapshot listener pushes live changes automatically. Refresh re-attaches the subscription when you want to force a reload — helpful during deploy debugging (we learned this on Vercel when the list appeared stuck).

**Why pagination:** With 100+ demo patients, a single scrolling table is slow to scan. Twenty per page keeps the dashboard readable without server-side query changes.

**Why toasts:** Inline form errors handle validation; toasts confirm successful CRUD operations and surface unexpected server errors without blocking the UI.

---

## Phase 6: Compliance and documentation

### Compliance touches and README

We added audit-oriented metadata and documentation for a healthcare context:

1. **`createdAt`, `updatedAt`, `lastEditedBy`** — timestamps are set via `serverTimestamp()` on create/update; `lastEditedBy` is written with a placeholder constant (`PLACEHOLDER_EDITOR_ID`) until Firebase Auth provides real user identity.
2. **`firestore.rules`** — deny-by-default sketch with a commented provider-isolation rule (`providerId == request.auth.uid`). Not enforced yet because auth is parked; documents the production target.
3. **Compliance documentation** — README PHI posture and `.env.example` (blank keys only, no secrets).

**Why placeholder `lastEditedBy`:** The field exists on the schema and is written on every mutation so the audit trail shape is ready. Swapping the constant for `request.auth.uid` (or a profile id) is a one-line change once auth lands.

**Why rules in-repo:** Security rules are the server-side enforcement layer for PHI. Committing a least-privilege sketch makes the production intent reviewable even while dev uses open rules.

**Why document PHI posture:** Reviewers and future operators need to know this is a demo posture. The README summarizes safeguards; this section records the decision to surface them during build.

---

## Phase 7: Deploy and hygiene

### Deploy and hygiene

Final cleanup before handoff:

- **Firebase Hosting** — `firebase.json` serves `dist/` with SPA rewrites; `npm run deploy` runs build + `firebase deploy --only hosting`. GitHub Actions workflows deploy on merge/PR preview.
- **Removed dead code** — unused Vite starter assets, unused service exports, seed utility (`@faker-js/faker`), and the unused `@fontsource-variable/geist` dependency.
- **No console noise** — no stray `console.log` calls in source.
- **No `any` types** — TypeScript strict throughout; Firestore snapshots cast via typed helpers.
- **`.gitignore`** — covers `node_modules`, `.env`, and build output (`dist`).
- **Production build** — `npm run build` (tsc + vite) passes with zero errors; build fails fast if any `VITE_FIREBASE_*` key is missing.

**Why Firebase Hosting over Vercel:** See [Firebase Hosting — why we deploy here](#firebase-hosting--why-we-deploy-here-and-not-vercel). Single-vendor deploy eliminated the env-var and API-referrer issues that blocked the Vercel production URL.

**Why a hygiene pass:** Rapid iteration left starter-template cruft and temporary demo tooling. Cleaning before handoff keeps the repo reviewable and the bundle lean (~280 KB gzip after removing Faker).

---

## Tooling notes

- **Package manager:** npm (project ships with `package-lock.json`; prompts reference `pnpm` but commands are equivalent).
- **Path alias:** `@/*` maps to `src/*` in both TypeScript and Vite config.
