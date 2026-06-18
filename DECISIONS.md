# Architecture & Design Decisions

This document records **why** each technical choice was made — alternatives considered, rationale, and scope boundaries. For project overview, design principles, setup, data model, and module map, see [README.md](./README.md).

Entries added during the documentation audit use an explicit **Decision → Alternatives → Rationale** format. Earlier entries retain their original prose; all are listed in the audit index below.

---

## Scope and future work capstone

Delivered scope and parked features. The [README Future work](./README.md#future-work) section frames these as incremental extensions; this section records scope boundaries and per-feature notes.

### In scope (delivered)

- Provider-facing patient dashboard with full CRUD
- Typed Zod data model and Firestore service layer
- Data-driven add/edit form with address normalization and browser autofill
- Live list via Firestore `onSnapshot`
- Search, status filter, responsive layout, and Sonner toasts
- Compliance metadata (`createdAt`, `updatedAt`, `lastEditedBy` placeholder)
- Deny-by-default `firestore.rules` sketch with commented provider isolation
- Finni Health theming (Outfit font, brand palette)

### Parked features (not implemented)

| Feature | Notes |
|---------|-------|
| **Provider auth and multi-tenant isolation** | Firebase Auth; `providerId` scoping per `firestore.rules` sketch |
| **Full audit logging** | Append-only change history beyond `lastEditedBy` / `updatedAt` |
| **BAA-backed address verification via server proxy** | Third-party validation (SmartyStreets, Google) routed through a backend proxy so PHI never hits client-only APIs |
| **Family caregiver intake portal** | Separate portal for caregivers to submit or update patient info |
| **Configurable intake questionnaires** | Dynamic pre-visit forms linked to patient records |
| **E-signature and consent** | Capture signed consent documents with audit trail |
| **Reminder emails and texts** | Automated outreach (appointments, onboarding steps) |
| **Scheduling and visit history** | Calendar integration and visit log per patient |
| **Insurance capture and billing** | Payer info, eligibility, and billing workflow |
| **Status change history** | Timeline of lifecycle transitions (who moved Inquiry → Active, when) |
| **Internationalized address** | Non-US formats, country-aware validation, i18n labels |
| **Seed utility** | Scripted demo/development data loader (currently manual entry via UI) |
| **Role-based access** | Admin vs. provider vs. read-only views |

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
| Firestore dev rules posture | Phase 1 — Firestore security rules for development |
| Finni theming (Outfit, tokens) | Phase 2 — Design tokens and theming |
| `usePatients` hook + explicit UI states | Phase 2 — List view and usePatients hook |
| Status badge colors | Phase 2 — List view (badge table) |
| Data-driven `patientFields` + RHF + Zod | Phase 3 — Add form |
| Address line2, autofill, normalization | Phase 3 — Address |
| `omitUndefined` for Firestore writes | Phase 3 — Firestore writes omit undefined |
| Sheet detail + reused form + AlertDialog delete | Phase 4 — Detail, edit, delete |
| Search/filter derived state | Phase 5 — Polish |
| `onSnapshot` live subscription | Phase 5 — Polish |
| Sonner toasts | Phase 5 — Polish |
| Responsive mobile cards | Phase 5 — Polish |
| Compliance metadata + rules sketch + README | Phase 6 — Compliance touches |
| Repo hygiene / production build | Phase 7 — Deploy and hygiene |
| Dual-layer validation (UI + service) | [Dual-layer validation](#dual-layer-validation-ui-and-service) |
| `@/` path alias | [Path alias](#path-alias-) |
| Demo data via UI (no seed script) | [Demo data without seed utility](#demo-data-without-seed-utility) |

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

### Demo data without seed utility

**Decision:** Populate demo data **manually through the Add Patient UI** (or the earlier smoke-test path). No scripted seed utility is included in this repo.

**Alternatives considered:** Firestore seed script, Firebase Emulator import, fixture JSON loaded on startup.

**Rationale:** A seed script adds scope and maintenance for a take-home with a live Firebase project. Manual entry validates the full CRUD path. A seed utility remains a parked item for team onboarding and CI fixtures.

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

Firebase credentials are loaded from `.env` using Vite's `VITE_*` prefix and initialized in `src/lib/firebase.ts`. A committed `.env.example` documents required keys; real secrets stay gitignored.

**Why:** Keeps credentials out of source control while allowing each developer to point at their own Firebase project.

### Firestore security rules for development

Initial Firebase rules denied all reads/writes (`allow read, write: if false`). We opened rules temporarily for the smoke test so unauthenticated client writes succeed during local development.

**Why:** The app does not yet use Firebase Auth. Production rules should require authentication and scope access to the `patients` collection.

---

## Phase 2: UI foundation, theming, and list view

### Component library: Radix UI via shadcn/ui (Nova preset)

We chose **Radix UI** as the underlying component library and initialized shadcn/ui with the **Nova** preset (`radix-nova` style in `components.json`).

**Why:** Radix provides accessible, unstyled primitives. shadcn/ui copies components into the repo (no opaque dependency), and the Nova preset gives a clean, modern baseline that we can theme to match Finni Health branding without fighting the defaults.

### Design tokens and theming

We matched Finni's extracted palette and **Outfit** font (Google Fonts, weights 300–700) in `src/index.css`:

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

The list layer gained five UX improvements:

1. **Search input** — filters by full name as you type.
2. **Status filter pills** — All, Inquiry, Onboarding, Active, Churned.
3. **`onSnapshot` live subscription** — replaces the one-time `listPatients` fetch in `usePatients`.
4. **Sonner toasts** — success and error feedback on create, update, and delete.
5. **Responsive layout** — card list on mobile, table on desktop; improved skeletons and spacing.

**Why derived state for search/filter:** The source `patients` array from Firestore is never mutated. Search query and status filter are separate UI state; `useMemo` derives `filteredPatients` from the source list. Filtering stays instant, predictable, and easy to reset without re-fetching.

**Why `onSnapshot`:** A one-time fetch requires manual refresh after every write. A Firestore snapshot listener pushes changes to all open clients in real time — when a patient is added, edited, or deleted, the list updates automatically with no refresh button.

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

- **Removed dead code** — unused Vite starter assets (`App.css`, template SVGs/hero image), unused service exports (`listPatients`, `getPatient`), and the unused `@fontsource-variable/geist` dependency (app uses Outfit via Google Fonts).
- **No console noise** — no stray `console.log` calls in source.
- **No `any` types** — TypeScript strict throughout; Firestore snapshots cast via typed helpers.
- **`.gitignore`** — covers `node_modules`, `.env`, and build output (`dist`).
- **Production build** — `pnpm build` (tsc + vite) passes with zero errors.

**Why a hygiene pass:** Six phases of rapid iteration leave starter-template cruft and unused exports. Cleaning before deploy keeps the repo reviewable and the bundle lean.

---

## Tooling notes

- **Package manager:** npm (project ships with `package-lock.json`; prompts reference `pnpm` but commands are equivalent).
- **Path alias:** `@/*` maps to `src/*` in both TypeScript and Vite config.
