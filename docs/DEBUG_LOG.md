# Debug Log

Retrospective log of bugs investigated during development and deployment. Use this when something “worked locally but not in production,” or when Firestore / env / hosting behavior is unclear.

**This is not runtime application logging.** Patient data is never written to logs (see [README — Compliance](../README.md#compliance-and-phi)). Ephemeral debug files (for example `.cursor/debug-*.log`) and `*.log` output are gitignored and are not part of this repo.

For architecture rationale and hosting decisions, see [DECISIONS.md](../DECISIONS.md). For the Vercel → Firebase Hosting migration summary, see [Firebase Hosting — why we deploy here](../DECISIONS.md#firebase-hosting--why-we-deploy-here-and-not-vercel).

---

## Summary

| ID | Symptom | Environment | Root cause (short) | Status |
|----|---------|-------------|-------------------|--------|
| [DBG-001](#dbg-001-zod-v4-enum-build-failure) | `tsc` fails on `types.ts` line 39 | Local build | Zod v4 removed `errorMap` on `z.enum` | Fixed |
| [DBG-002](#dbg-002-missing-env--firestore-fails) | Firestore calls fail with no config | Local dev | No `.env` file | Fixed |
| [DBG-003](#dbg-003-firestore-permission-denied-on-smoke-test) | `addPatient` → “Missing or insufficient permissions” | Local + Firebase | Console rules deny all reads/writes | Fixed (dev rules) |
| [DBG-004](#dbg-004-undefined-field-on-add-patient) | Add patient → `Unsupported field value: undefined` | Local | Optional fields sent as `undefined` to Firestore | Fixed |
| [DBG-005](#dbg-005-vercel-firebase-not-configured) | Production banner: “Firebase not configured” | Vercel | Env names `apiKey` vs `VITE_FIREBASE_*`; Vite embeds at build time | Fixed |
| [DBG-006](#dbg-006-vercel-typescript-build-failure) | Vercel build exits 2 on `npm run build` | Vercel CI | Unused import `getFirebaseEnvDiagnostics` (TS6133) | Fixed |
| [DBG-007](#dbg-007-vercel-production-hangs-and-empty-list) | ~1 min load, no patients, UI stuck on Saving/Seeding | Vercel | Env/referrers/rules + hung Firestore promises + missing index on `orderBy` | Mitigated; migrated hosting |
| [DBG-008](#dbg-008-missing-messagingsenderid-at-build) | Build fails after env var reset | Vercel / local CI | `VITE_FIREBASE_MESSAGING_SENDER_ID` not set | Fixed |
| [DBG-009](#dbg-009-migration-to-firebase-hosting) | Cross-vendor deploy still fragile | Production | Firebase DB + Vercel hosting + separate env UI | Resolved (Firebase Hosting) |

---

## DBG-001: Zod v4 enum build failure

| | |
|---|---|
| **Environment** | Local (`npm run build` / `tsc -b`) |
| **Symptom** | TypeScript error on `src/lib/types.ts` — invalid `errorMap` option on `z.enum`. |
| **Hypotheses** | Schema API mismatch after dependency upgrade. |
| **Root cause** | Zod v4 replaced per-field `errorMap` with `message` on `z.enum`. |
| **Resolution** | Changed status enum to `{ message: "Please select a patient status" }`. |
| **Files** | `src/lib/types.ts` |

---

## DBG-002: Missing env — Firestore fails

| | |
|---|---|
| **Environment** | Local dev (`npm run dev`) |
| **Symptom** | Firebase config values undefined; Firestore operations fail. |
| **Hypotheses** | `.env` not created; Vite not loading `VITE_*` vars. |
| **Root cause** | No `.env` in project root (gitignored by design). |
| **Resolution** | Added `.env` (local only) and committed `.env.example` with all six `VITE_FIREBASE_*` keys. |
| **Files** | `.env.example`, `.gitignore` |

---

## DBG-003: Firestore permission denied on smoke test

| | |
|---|---|
| **Environment** | Local dev → `finni-interview-8d407` Firestore |
| **Symptom** | Smoke-test `addPatient` throws “Missing or insufficient permissions.” |
| **Hypotheses tested** | (H1) Rules block writes · (H2) Wrong `projectId` · (H3) Zod failure · (H4) Incomplete Firebase init · (H5) Wrong collection path |
| **Root cause** | **H1 confirmed** — committed `firestore.rules` is deny-all; Console rules were also `allow read, write: if false`. |
| **Resolution** | Published temporary open rules in Firebase Console for dev (`allow read, write: if true` on `patients` or `/{document=**}`). Documented production target in-repo rules sketch. |
| **Temporary instrumentation** | Agent debug `fetch` to local ingest endpoint in `firebase.ts` and `patients.ts` — **removed** after confirmation. |
| **Files** | `firestore.rules` (sketch), Firebase Console rules |

---

## DBG-004: Undefined field on add patient

| | |
|---|---|
| **Environment** | Local dev |
| **Symptom** | Form submit error: `Unsupported field value: undefined (found in field middleName)`. |
| **Hypotheses tested** | (H1) Empty `middleName` → `undefined` · (H2) Empty `address.line2` → `undefined` · (H3) Payload passed straight to `addDoc` · (H4) Firestore rejects `undefined` |
| **Root cause** | **H1–H4 confirmed** — Zod `trimmedOptional()` correctly normalizes `""` to `undefined`, but Firestore does not accept `undefined` field values. |
| **Resolution** | Added `omitUndefined()` in `src/services/patients.ts` to strip undefined keys before every write. |
| **Temporary instrumentation** | Pre-write payload logging in `patients.ts` — **removed** after fix verified. |
| **Files** | `src/services/patients.ts`, `src/lib/types.ts` |

---

## DBG-005: Vercel — “Firebase not configured”

| | |
|---|---|
| **Environment** | Vercel production (`*.vercel.app`) |
| **Symptom** | App loads but shows “Firebase not configured”; patient list empty; CRUD appears disconnected. |
| **Hypotheses tested** | (H1) Env var **names** wrong for Vite — user set Firebase Console names (`apiKey`, `projectId`, …) instead of `VITE_FIREBASE_*` |
| **Root cause** | **H1 confirmed** — Vite only auto-exposes `VITE_*` to client code. Vercel had correct **values** but names that never reached the browser bundle. Build-time `import.meta.env` was empty for all six fields. |
| **Resolution** | `resolveFirebaseEnv.ts` + `vite.config.ts` embed `__FIREBASE_CONFIG__` at build time, accepting **both** `VITE_FIREBASE_*` and Firebase Console field names. `requireDb()` fails fast with a clear message. |
| **Verification** | Local `vite build` with `apiKey=… projectId=…` style vars → bundle contains `finni-interview-8d407`, `configured: true`. |
| **Commit** | `84e11c6` — Accept Firebase Console env var names on Vercel builds |
| **Files** | `vite.config.ts`, `src/lib/resolveFirebaseEnv.ts`, `src/lib/firebaseConfig.ts`, `src/lib/firebase.ts` |

---

## DBG-006: Vercel TypeScript build failure

| | |
|---|---|
| **Environment** | Vercel CI (`npm run build` → `tsc -b`) |
| **Symptom** | Build failed in ~9s: `error TS6133: 'getFirebaseEnvDiagnostics' is declared but its value is never read.` |
| **Root cause** | Redundant import in `firebase.ts` — symbol only re-exported from `firebaseConfig.ts`. Strict `noUnusedLocals` fails CI before Vite runs. |
| **Resolution** | Removed unused direct import. |
| **Commit** | `c67a9e1` — Fix Vercel build: remove unused firebase import |
| **Files** | `src/lib/firebase.ts` |

---

## DBG-007: Vercel production hangs and empty list

| | |
|---|---|
| **Environment** | Vercel production |
| **Symptoms** | (1) ~60s to load patients · (2) No patients in list · (3) Seed button stuck on “Seeding…” · (4) Add patient stuck on “Saving…” despite success · (5) Refresh button missing · (6) Seed-created patient not in Firestore / not deletable |
| **Hypotheses** | Residual env/referrer issues · Firestore rules · `orderBy('createdAt')` missing composite index · Firestore offline queue hanging without timeout · Seed utility masking real connectivity |
| **Root causes (combined)** | Cross-vendor friction (DBG-005/006 not sufficient alone): API key HTTP referrers may not include `*.vercel.app`; Console rules vs local; `onSnapshot` + `orderBy` can hang waiting for index; `addDoc`/`onSnapshot` promises never reject when network/rules block — UI spinners never clear. Seed button wrote optimistically to local state in some cases without confirming persistence. |
| **Resolutions** | See commits below. Ultimately **migrated to Firebase Hosting** (DBG-009) rather than continue Vercel cross-vendor debugging. |
| **Code changes** | |
| | • Dropped server `orderBy` — load full collection, sort client-side (`sortPatients.ts`) |
| | • `withFirestoreTimeout()` (15s) on writes; 20s load timeout in `usePatients` |
| | • Build-time validation if any of six Firebase keys missing |
| | • Standardized docs on `VITE_FIREBASE_*` naming |
| | • Removed seed button + `@faker-js/faker` |
| | • Restored manual **Refresh** button; pagination 20/page |
| **Commits** | `c963d03`, `5973095`, `c4f69a6`, `cebf131` |
| **Files** | `src/services/patients.ts`, `src/hooks/usePatients.ts`, `src/lib/firestoreTimeout.ts`, `src/lib/sortPatients.ts`, `src/components/PatientList.tsx`, `vite.config.ts` |

---

## DBG-008: Missing messagingSenderId at build

| | |
|---|---|
| **Environment** | Vercel / `CI=true` local build after env reset |
| **Symptom** | Build fails; plugin reports missing `messagingSenderId` / `VITE_FIREBASE_MESSAGING_SENDER_ID`. |
| **Root cause** | User reset Vercel env vars; one of six required fields omitted. Easy to miss because Firebase Console labels it differently from other keys. |
| **Resolution** | `formatMissingFirebaseEnvMessage()` lists all missing keys; `FIREBASE_ENV_ALIASES` accepts common typos; `.env.example` documents exact names. |
| **Commit** | `5973095`, `c4f69a6` |
| **Files** | `src/lib/resolveFirebaseEnv.ts`, `vite.config.ts`, `.env.example` |

---

## DBG-009: Migration to Firebase Hosting

| | |
|---|---|
| **Environment** | Production deploy target |
| **Symptom** | Repeated Vercel production issues (DBG-005–008) — env, referrers, and cross-console debugging outweighed benefits of separate hosting. |
| **Root cause** | Vite + Firebase SPA fits single-vendor deploy: Firestore, rules, API keys, and static hosting in one Firebase project. |
| **Resolution** | Added `firebase.json`, `.firebaserc`, `npm run deploy`, GitHub Actions hosting workflows; documented rationale in DECISIONS.md. |
| **Commits** | `cebf131` (hosting setup), `98324c8` (docs) |
| **Files** | `firebase.json`, `.firebaserc`, `package.json`, `.github/workflows/firebase-hosting-*.yml`, `DECISIONS.md`, `README.md` |

---

## Practices used during debugging

1. **Hypothesis list first** — write 3–5 concrete causes before changing code.
2. **Temporary instrumentation** — short-lived `fetch` to a local debug ingest or structured pre-write logs, wrapped in `// #region agent log` for easy removal.
3. **Remove instrumentation before merge** — only durable fixes (e.g. `omitUndefined`, timeouts) stay in source.
4. **Reproduce at build time** — `vite build` with the same env names as CI to verify embedded config without deploying.
5. **Fail fast** — `requireDb()`, build-time env validation, and Firestore timeouts so the UI does not spin forever.
6. **Document, don’t dump** — this file captures incidents; raw logs stay out of git.

---

## Related commits (debug / deploy)

| Commit | Summary |
|--------|---------|
| `84e11c6` | Map Firebase Console env names at Vercel build time |
| `c67a9e1` | Fix TS6133 unused import blocking Vercel build |
| `c963d03` | Client-side sort, load timeout, build env validation |
| `5973095` | Clear error when `messagingSenderId` missing |
| `c4f69a6` | Firestore write timeouts; standardize `VITE_*` docs |
| `cebf131` | Remove seed; refresh + pagination; Firebase deploy |
| `98324c8` | Docs: Firebase Hosting rationale; retire Vercel deploy instructions |
