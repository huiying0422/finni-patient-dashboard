/**
 * React hook that exposes the live patient list to UI components.
 *
 * Wraps the Firestore onSnapshot subscription with loading and error state so
 * views can render skeletons, empty states, or error messages consistently.
 */
import { useCallback, useEffect, useState } from "react";

import { firebaseConfig } from "@/lib/firebase";
import { subscribePatients } from "@/services/patients";
import type { Patient } from "@/lib/types";

const LOAD_TIMEOUT_MS = 20_000;

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    let settled = false;

    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      setLoading(false);
      setError(
        `Timed out loading patients from Firebase (${firebaseConfig.projectId}). ` +
          "Check Firestore rules and redeploy.",
      );
    }, LOAD_TIMEOUT_MS);

    const unsubscribe = subscribePatients(
      (nextPatients) => {
        settled = true;
        window.clearTimeout(timeoutId);
        setPatients(nextPatients);
        setLoading(false);
        setError(null);
      },
      (err) => {
        settled = true;
        window.clearTimeout(timeoutId);
        setError(err.message || "Failed to load patients");
        setPatients([]);
        setLoading(false);
      },
    );

    return () => {
      settled = true;
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [refreshKey]);

  return {
    patients,
    loading,
    error,
    projectId: firebaseConfig.projectId,
    refresh,
  };
}
