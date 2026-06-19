/**
 * Phase 2 — usePatients hook
 *
 * React components can't hold a Firestore listener directly in a clean way.
 * This hook owns the subscription and gives PatientList simple variables: patients, loading, error.
 */
// ---------------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------------

// useCallback = remember a function so it doesn't change every render (for refresh button).
// useEffect = run side effects (start/stop Firestore listener) when component mounts.
// useState = store patients list, loading flag, error message, refresh counter.
import { useCallback, useEffect, useState } from "react";

// firebaseConfig.projectId — shown in error footer for debugging (not patient data).
import { firebaseConfig } from "@/lib/firebase";

// subscribePatients — the ONLY function that opens the live Firestore listener.
import { subscribePatients } from "@/services/patients";

// Patient — TypeScript shape of one record from the database.
import type { Patient } from "@/lib/types";

/** If nothing comes back in 20 seconds, stop spinning and show an error. */
const LOAD_TIMEOUT_MS = 20_000;

export function usePatients() {
  // The live list of patients from Firestore — starts empty until first snapshot arrives.
  const [patients, setPatients] = useState<Patient[]>([]);

  // true while we're waiting for the first (or refreshed) load.
  const [loading, setLoading] = useState(true);

  // null when happy; a string message when something went wrong.
  const [error, setError] = useState<string | null>(null);

  // Bumping this number forces useEffect to tear down and re-subscribe (Refresh button).
  const [refreshKey, setRefreshKey] = useState(0);

  /**
   * Called when user clicks Refresh on the list.
   * We don't mutate Firestore — we just reconnect the listener.
   */
  const refresh = useCallback(() => {
    setLoading(true); // show skeleton again
    setError(null); // clear old error
    setRefreshKey((current) => current + 1); // triggers useEffect below
  }, []);

  // This effect runs on mount and whenever refreshKey changes.
  useEffect(() => {
    // "settled" means we already got success OR error — don't fire timeout after that.
    let settled = false;

    // Backup alarm clock: if Firestore never answers, tell the user instead of spinning forever.
    const timeoutId = window.setTimeout(() => {
      if (settled) return; // already done — ignore timeout
      setLoading(false);
      setError(
        `Timed out loading patients from Firebase (${firebaseConfig.projectId}). ` +
          "Check Firestore rules and redeploy.",
      );
    }, LOAD_TIMEOUT_MS);

    // Start listening — subscribePatients returns a stop function.
    const unsubscribe = subscribePatients(
      (nextPatients) => {
        // SUCCESS path — we got data from Firestore.
        settled = true;
        window.clearTimeout(timeoutId); // cancel the alarm clock
        setPatients(nextPatients); // store the list for the UI
        setLoading(false); // hide skeleton
        setError(null); // clear any old error
      },
      (err) => {
        // ERROR path — permission denied, bad config, etc.
        settled = true;
        window.clearTimeout(timeoutId);
        setError(err.message || "Failed to load patients");
        setPatients([]); // empty list on error
        setLoading(false);
      },
    );

    // CLEANUP — runs when component unmounts OR refreshKey changes (before re-subscribing).
    return () => {
      settled = true; // prevent timeout from firing after unmount
      window.clearTimeout(timeoutId);
      unsubscribe(); // tell Firestore to stop sending updates
    };
  }, [refreshKey]);

  // Everything PatientList needs in one object.
  return {
    patients,
    loading,
    error,
    projectId: firebaseConfig.projectId, // for debugging footer — not patient data
    refresh,
  };
}
