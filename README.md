# Finni Patient Dashboard

A patient management dashboard for Finni Health providers. Track patients through the care lifecycle — Inquiry, Onboarding, Active, and Churned — with full CRUD, live Firestore updates, search, and status filtering.

Built as a technical take-home project demonstrating typed data modeling, a clean service layer, and healthcare-aware design choices.

---

## What it does

- **List patients** with live updates via Firestore `onSnapshot`
- **Search** by name and **filter** by status (client-side derived state)
- **Add** patients through a validated dialog form
- **View detail** in a side sheet (all fields + timestamps)
- **Edit** and **delete** patients (delete requires confirmation)
- **Toast feedback** on create, update, and delete

---

## Stack

| Layer | Technology |
|-------|------------|
| UI | React 19, TypeScript, Vite |
| Components | shadcn/ui (Radix UI, Nova preset) |
| Styling | Tailwind CSS v4, Finni Health brand tokens |
| Forms | React Hook Form + Zod |
| Database | Firebase Firestore (v9 modular SDK) |
| Toasts | Sonner |

Architecture decisions are documented in [DECISIONS.md](./DECISIONS.md).

---

## How to run

### Prerequisites

- Node.js 18+
- A Firebase project with Firestore enabled

### 1. Install dependencies

```bash
pnpm install
```

(`npm install` works equivalently — the repo ships with `package-lock.json`.)

### 2. Configure environment variables

Copy the example file and fill in your Firebase web app config:

```bash
cp .env.example .env
```

Required variables (from Firebase Console → Project settings → Your apps):

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `{projectId}.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket URL |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Web app ID |

Never commit `.env` — it is gitignored.

### 3. Firestore rules (development)

For local development, Firestore rules must allow reads and writes. The committed [`firestore.rules`](./firestore.rules) file **denies everything by default** and documents the production least-privilege sketch.

In the Firebase Console → Firestore → Rules, you may temporarily use open rules for dev:

```javascript
allow read, write: if true;  // DEV ONLY
```

Publish the rules before testing.

### 4. Start the dev server

```bash
pnpm dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

### 5. Build for production

```bash
pnpm build
```

---

## Data model

### Patient form fields (`PatientFormValues`)

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

Validation is defined once in `src/lib/types.ts` (Zod) and enforced in both the UI and service layer.

### Full patient record (`Patient`)

Extends form values with Firestore metadata:

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Firestore document ID |
| `providerId` | string? | Reserved for provider isolation (auth parked) |
| `createdAt` | Timestamp | Set on create |
| `updatedAt` | Timestamp | Set on create and every update |
| `lastEditedBy` | string? | Placeholder constant until auth is wired |

Schemas and types live in `src/lib/types.ts`. All Firestore access is in `src/services/patients.ts`.

---

## PHI handling note

This dashboard stores patient demographic data that may constitute **Protected Health Information (PHI)** under HIPAA when used with real patients.

Current safeguards and posture:

- **Data minimization** — only fields required for the workflow are collected; no clinical notes or insurance IDs.
- **No PHI in logs or LLMs** — patient data is not sent to analytics, console logging, or AI tools in this codebase.
- **Server-side enforcement (production)** — client validation is not sufficient; Firestore security rules (see `firestore.rules`) must enforce authentication and provider-scoped access in production.
- **Encryption** — Firebase provides encryption in transit (TLS) and at rest by default.
- **BAA required** — a signed Business Associate Agreement with Google Cloud / Firebase is required before handling real patient PHI in production.

This take-home uses a personal Firebase project with open dev rules. **Do not use production patient data without proper auth, rules, and a BAA in place.**

---

## Future work

- **Provider authentication and isolation** — Firebase Auth with `providerId` scoping per the rules sketch in `firestore.rules`
- **Full audit log** — append-only change history (who changed what, when) beyond `lastEditedBy` / `updatedAt`
- **Intake questionnaires** — structured pre-visit forms linked to patient records
- **Address verification** — third-party validation service (requires BAA evaluation)
- **Role-based access** — admin vs. provider vs. read-only views

---

## Project structure

```
src/
  components/     UI components (PatientList, PatientForm, dialogs, sheets)
  hooks/          usePatients (live Firestore subscription)
  lib/            types, field config, Firebase init, constants
  services/       patients.ts — sole Firestore access point
firestore.rules   Least-privilege rules sketch
DECISIONS.md      Architecture and design decision log
.env.example      Environment variable template (no secrets)
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Type-check and production build |
| `pnpm preview` | Preview production build |
| `pnpm lint` | Run ESLint |
