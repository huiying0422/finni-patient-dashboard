# Architecture & Design Decisions

This document records key decisions made while building the Finni Patient Dashboard take-home project.

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

The patient list is rendered by `PatientList` using a `usePatients` hook that wraps `listPatients` from the service layer.

**Why a hook:** The service returns data; the hook owns UI state (`loading`, `error`, `patients`) and exposes `refresh`. Components stay presentational and do not duplicate fetch logic.

**Why explicit states:** We render three distinct UI states — loading skeleton, empty state, and error state — instead of a blank screen or generic spinner. This gives users clear feedback and makes edge cases testable.

Status badges use lifecycle-specific colors:

- **Inquiry** — lavender (`#D1BCE7` / `#4A3A54`)
- **Onboarding** — peach (`#FDE7D6` / `#B8480F`)
- **Active** — mint (`#E2F3E7` / `#2E7D3A`)
- **Churned** — gray (`#E6E6E6` / `#758696`)

---

## Tooling notes

- **Package manager:** npm (project ships with `package-lock.json`; prompts reference `pnpm` but commands are equivalent).
- **Path alias:** `@/*` maps to `src/*` in both TypeScript and Vite config.
