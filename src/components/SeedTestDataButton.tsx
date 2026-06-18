/**
 * TEMPORARY — dev-only "Seed test data" control. Delete this file when no longer needed.
 */
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { seedPatients } from "@/lib/seedPatients";

export function SeedTestDataButton() {
  const [isSeeding, setIsSeeding] = useState(false);

  async function handleSeed() {
    setIsSeeding(true);

    try {
      await seedPatients(50);
      toast.success("Seeded 50 test patients");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to seed test data";
      toast.error(message);
    } finally {
      setIsSeeding(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isSeeding}
      onClick={() => void handleSeed()}
      className="border-dashed border-amber-500 text-amber-700 hover:bg-amber-50"
    >
      {isSeeding ? "Seeding…" : "Seed test data (temporary)"}
    </Button>
  );
}
