# Finni Patient Dashboard

Provider-facing patient dashboard for Finni Health — track patients through Inquiry, Onboarding, Active, and Churned with full CRUD, live Firestore updates, search, and status filtering.

## Design principles

Three pillars guided every build decision. For live-demo stack scripts, scope boundaries, and design-token extraction, see [DECISIONS.md](./DECISIONS.md).

**Pillar 1 — Build the right thing.** YAGNI, KISS, and MVP scope discipline. Ship a complete provider workflow first; park auth, billing, intake portals, and other product surface area until the core CRUD path is solid.

**Pillar 2 — Extensible without breaking what works.** A clean layered architecture (UI → hooks → service → Firestore), a data-driven form (`patientFields` + shared Zod schema), and an isolated service layer so new fields, features, and integrations slot in without rewriting existing screens.

**Pillar 3 — Patient data security and compliance.** Least-privilege access (rules sketch in-repo), audit timestamps on every mutation, data minimization, and no routing PHI to third-party APIs without a BAA-backed server proxy.

---

## Stack

| Layer | Technology | Why (summary) |
|-------|------------|---------------|
| UI | React 19, TypeScript, Vite | Typed SPA, fast dev, static deploy |
| Components | shadcn/ui (Radix UI, Nova preset) | Accessible primitives, repo-owned components |
| Styling | Tailwind CSS v4, Finni brand tokens | [Extracted from public CSS](./DECISIONS.md#design-token-extraction-finni-health-branding) |
| Forms | React Hook Form + Zod | Shared schema for UI and Firestore writes |
| Database | Firebase Firestore (v9 modular SDK) | Real-time list, rules sketch for auth |
| Toasts | Sonner | Non-blocking success/error feedback after CRUD |

Full alternatives and demo talking points: [DECISIONS.md — Stack at a glance](./DECISIONS.md#stack-at-a-glance-demo-summary).

---

## How to run

### Prerequisites

- Node.js 18+
- A Firebase project with Firestore enabled

### Install

```bash
pnpm install
```

(`npm install` works equivalently.)

### Environment variables

Copy the example file and fill in your Firebase web app config:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `{projectId}.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket URL |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Web app ID |

Never commit `.env` — it is gitignored.

### Firestore rules (development)

The committed [`firestore.rules`](./firestore.rules) denies all access by default and documents the production least-privilege target. For local dev, temporarily open rules in the Firebase Console before testing:

```javascript
allow read, write: if true;  // DEV ONLY
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server (typically `http://localhost:5173`) |
| `pnpm build` | Type-check and production build to `dist/` |
| `pnpm preview` | Preview production build |
| `pnpm deploy` | Build and deploy to Firebase Hosting |
| `pnpm lint` | Run ESLint |

### Deploy to Firebase Hosting

This is a **Vite SPA** — Firebase config is embedded at build time from your local `.env` (or shell env vars). Output goes to `dist/`, which [`firebase.json`](./firebase.json) serves.

**Prerequisites:** [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools` or use the project devDependency) and `firebase login`.

1. Copy `.env.example` → `.env` and fill in all six `VITE_FIREBASE_*` values from Firebase Console → Project settings → Your apps.
2. Build locally: `npm run build` (writes to `dist/`).
3. Deploy: `npm run deploy` (runs build + `firebase deploy --only hosting`).

For CI or Firebase App Hosting, set the same `VITE_FIREBASE_*` variables in the build environment before `npm run build`.

**Firestore rules (required for CRUD):** Firebase Console → Firestore → Rules → publish dev-open rules:

```javascript
allow read, write: if true;  // DEV ONLY
```

The committed [`firestore.rules`](./firestore.rules) file is a deny-all sketch — publish open rules in the Console for the demo.

---

## Data model

Patient shape and validation rules live in `src/lib/types.ts`. The same Zod schema powers form validation and service-layer writes.

### Form fields (`PatientFormValues`)

| Field | Type | Required |
|-------|------|----------|
| `firstName` | string | yes |
| `middleName` | string | no |
| `lastName` | string | yes |
| `dateOfBirth` | string (ISO date) | yes, not in future |
| `status` | enum | yes — `Inquiry`, `Onboarding`, `Active`, `Churned` |
| `address.street` | string | yes |
| `address.line2` | string | no (apt / unit) |
| `address.city` | string | yes |
| `address.state` | string | yes, 2-letter US code |
| `address.zip` | string | yes, US ZIP |

### Stored record (`Patient`)

Extends form values with Firestore metadata:

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Firestore document ID |
| `providerId` | string? | Reserved for multi-tenant isolation |
| `createdAt` | Timestamp | Set on create |
| `updatedAt` | Timestamp | Set on create and every update |
| `lastEditedBy` | string? | Placeholder until auth is wired |

All Firestore reads and writes go through `src/services/patients.ts`.

---

## Architecture map

Each module has a single responsibility. Build phases show when the module was introduced.

| Module | Responsibility | Phase |
|--------|----------------|-------|
| `src/lib/types.ts` | Zod schemas, inferred form types, and `Patient` record shape | 1 |
| `src/lib/firebase.ts` | Firebase app initialization and shared Firestore instance | 1 |
| `src/services/patients.ts` | Sole Firestore access — subscribe, add, update, delete | 1 · live `onSnapshot` in 5 |
| `src/hooks/usePatients.ts` | Bridges Firestore subscription to React list/loading/error state | 2 |
| `src/lib/patientFields.ts` | Declarative field config driving add and edit forms | 3 |
| `src/components/PatientForm.tsx` | Shared create/edit form (RHF + Zod) | 3 |
| `src/components/AddPatientDialog.tsx` | Add-patient modal workflow | 3 |
| `src/components/PatientList.tsx` | Patient list, search, status filter, responsive layout | 2 · search/filter/toasts in 5 |
| `src/components/PatientDetailSheet.tsx` | View, edit, and delete in a side panel | 4 |
| `src/lib/patientFormat.ts` | Display formatters and status badge styling | 8 |
| `src/lib/constants.ts` | Placeholder editor identity until Firebase Auth | 6 |
| `src/lib/utils.ts` | Tailwind class merge helper (`cn`) | 2 |
| `src/App.tsx` | App shell, header, and global toast host | 2 |
| `src/components/ui/*` | shadcn/ui primitives (button, dialog, sheet, table, …) | 2–4 |
| `firestore.rules` | Deny-by-default rules with commented provider isolation | 6 |
| `.env.example` | Environment variable template (no secrets) | 1 |

Layering: **components** render UI and call **hooks** or **services**; **hooks** wrap subscriptions; **services** validate with Zod and talk to Firestore. Components never import the Firebase SDK directly.

---

## Compliance and PHI

This dashboard stores patient demographics that may constitute **Protected Health Information (PHI)** under HIPAA when used with real patients.

Current posture:

- **Data minimization** — workflow fields only; no clinical notes or insurance IDs.
- **No PHI in logs or external tools** — patient data is not sent to analytics, console output, or AI services from this codebase.
- **Audit metadata** — `createdAt`, `updatedAt`, and `lastEditedBy` on every mutation; authoritative timestamps via `serverTimestamp()`.
- **Server-side enforcement (production)** — client validation is necessary but not sufficient; `firestore.rules` must enforce auth and provider-scoped access before real use.
- **Encryption** — Firebase provides TLS in transit and encryption at rest by default.
- **BAA required** — a signed Business Associate Agreement with Google Cloud / Firebase is required before handling real patient PHI.

This take-home uses a personal Firebase project with open dev rules. **Do not use production patient data without proper auth, rules, and a BAA in place.**

---

## Future work

The layered architecture is designed so new capabilities can be added incrementally — and many (auth scoping, audit logging, live subscriptions) can land without breaking existing CRUD.

**Presenting scope?** Use the [DECISIONS scope capstone](./DECISIONS.md#scope-and-future-work-capstone) — it has demo lines and a “why parked / how we’d add it” table.

Parked product features:

- Provider authentication and multi-tenant isolation (`providerId` + rules)
- Full audit logging (append-only change history)
- BAA-backed address verification via server proxy
- Family caregiver intake portal
- Configurable intake questionnaires
- E-signature and consent capture
- Reminder emails and texts
- Scheduling and visit history
- Insurance capture and billing
- Status change history (lifecycle timeline)
- Internationalized address formats
- Seed utility for demo/CI fixtures
- Role-based access (admin, provider, read-only)

Per-feature notes and architecture hooks: [DECISIONS.md — Scope capstone](./DECISIONS.md#scope-and-future-work-capstone).
