import { useState } from "react";

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

type AddPatientDialogProps = {
  onPatientAdded: () => void | Promise<void>;
};

export function AddPatientDialog({ onPatientAdded }: AddPatientDialogProps) {
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
      setFormKey((current) => current + 1);
      await onPatientAdded();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to add patient",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSubmitError(null);
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
