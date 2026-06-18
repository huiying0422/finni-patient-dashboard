/**
 * React hook that exposes the live patient list to UI components.
 *
 * Wraps the Firestore onSnapshot subscription with loading and error state so
 * views can render skeletons, empty states, or error messages consistently.
 */
import { useEffect, useState } from "react";

import { firebaseConfig } from "@/lib/firebase";
import { subscribePatients } from "@/services/patients";
import type { Patient } from "@/lib/types";

const LOAD_TIMEOUT_MS = 20_000;

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let settled = false;

    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      setLoading(false);
      setError(
        `Timed out loading patients from Firebase (${firebaseConfig.projectId}). ` +
          "Check Firestore rules, API key HTTP referrer (allow https://*.vercel.app/*), and redeploy.",
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
  }, []);

  return { patients, loading, error, projectId: firebaseConfig.projectId };
}
