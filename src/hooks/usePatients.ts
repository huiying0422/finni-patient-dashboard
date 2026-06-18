import { useEffect, useState } from "react";

import { subscribePatients } from "@/services/patients";
import type { Patient } from "@/lib/types";

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribePatients(
      (nextPatients) => {
        setPatients(nextPatients);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message || "Failed to load patients");
        setPatients([]);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  return { patients, loading, error };
}
