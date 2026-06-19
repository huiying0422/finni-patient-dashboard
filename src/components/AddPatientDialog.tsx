/**
 * Phase 3 — Add-patient modal (popup dialog workflow)
 *
 * The orange "Add patient" button opens this dialog.
 * The form inside is PatientForm — this file only handles open/close and saving.
 */
// ---------------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------------

// useState = remember if dialog is open, if we're saving, any error text, form reset key.
import { useState } from "react";

// toast = corner pop-ups ("Patient added successfully").
import { toast } from "sonner";

// PatientForm = the actual fields — shared with edit flow in detail sheet.
import { PatientForm } from "@/components/PatientForm";

// Button = Add patient trigger, Cancel, Save in footer.
import { Button } from "@/components/ui/button";

// Dialog pieces = modal popup shell from shadcn/Radix.
import {
  Dialog, // root — open/closed state lives here
  DialogContent, // white box in the center
  DialogDescription, // gray subtitle under title
  DialogFooter, // bottom row with Cancel + Save
  DialogHeader, // top section wrapping title + description
  DialogTitle, // bold "Add patient" heading
  DialogTrigger, // wraps the button that opens the dialog
} from "@/components/ui/dialog";

// PatientFormValues = TypeScript type for validated form data.
import type { PatientFormValues } from "@/lib/types";

// addPatient = service function that writes to Firestore (validates again there).
import { addPatient } from "@/services/patients";

export function AddPatientDialog() {
  // Is the popup visible right now?
  const [open, setOpen] = useState(false);

  // True while waiting on Firestore — disables buttons, shows "Saving…".
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If save failed, show this message under the form in red.
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Bumping formKey remounts PatientForm = fresh empty fields next open.
  const [formKey, setFormKey] = useState(0);

  /**
   * Runs when user clicks Save and the form passed validation.
   */
  async function handleSubmit(values: PatientFormValues) {
    setIsSubmitting(true); // disable buttons, show "Saving…"
    setSubmitError(null); // clear any old error from a previous attempt

    try {
      // Ask the service layer to write to Firestore (validates again there too).
      await addPatient(values);

      setOpen(false); // close the popup — success!
      setFormKey((current) => current + 1); // next open = fresh empty form
      toast.success("Patient added successfully"); // little green message top-right
    } catch (error) {
      // Something failed (rules, network, validation edge case).
      const message =
        error instanceof Error ? error.message : "Failed to add patient";
      setSubmitError(message); // show under the form
      toast.error(message); // also toast so user notices
    } finally {
      setIsSubmitting(false); // re-enable buttons no matter what
    }
  }

  /**
   * Runs when user clicks X, Cancel, or clicks outside the dialog.
   */
  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      // Closing — throw away half-filled form and any error text.
      setSubmitError(null);
      setFormKey((current) => current + 1);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* asChild = use our Button as the trigger instead of a default button */}
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

        {/* key={formKey} forces React to remount = brand new empty form */}
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
          {/* Button lives here but submits the form above via matching formId */}
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
