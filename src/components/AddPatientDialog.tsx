/**
 * Modal workflow for adding a new patient.
 *
 * Owns dialog open/close state, submit loading, and success/error feedback;
 * delegates field rendering and validation to PatientForm.
 */
import { useState } from "react";
import { toast } from "sonner";

import { PatientForm } from "@/components/PatientForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PatientFormValues } from "@/lib/types";
import { addPatient } from "@/services/patients";

export function AddPatientDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(values: PatientFormValues) {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await addPatient(values);
      setOpen(false);
      // Remount the form so the next open starts with empty defaults.
      setFormKey((current) => current + 1);
      toast.success("Patient added successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add patient";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSubmitError(null);
      // Discard in-progress edits when the dialog closes without saving.
      setFormKey((current) => current + 1);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Add patient</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add patient</DialogTitle>
          <DialogDescription>
            Enter patient details. All fields are validated before saving.
          </DialogDescription>
        </DialogHeader>

        <PatientForm
          key={formKey}
          formId="add-patient-form"
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />

        {submitError ? (
          <p className="text-sm text-destructive">{submitError}</p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          {/* Submit lives in the footer but targets the form by id — PatientForm has no inline submit row here. */}
          <Button
            type="submit"
            form="add-patient-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : "Save patient"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
