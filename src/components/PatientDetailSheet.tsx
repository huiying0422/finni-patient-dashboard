/**
 * Phase 4 — Side panel: view one patient, edit them, or delete them
 *
 * Slides in from the right when you click a row in PatientList.
 * Read mode shows all fields; Edit mode reuses the same PatientForm as Add.
 */
// ---------------------------------------------------------------------------
// IMPORTS — each line pulls in a tool this file needs (like gathering ingredients)
// ---------------------------------------------------------------------------

// useState = React's way to remember things that change (is the sheet editing? saving?).
import { useState } from "react";

// toast = the little pop-up messages ("Patient updated") in the corner of the screen.
import { toast } from "sonner";

// PatientForm = the same big form used when adding a patient — we reuse it here for editing.
import { PatientForm } from "@/components/PatientForm";

// AlertDialog pieces = the "Are you SURE you want to delete?" confirmation popup.
import {
  AlertDialog, // wraps the whole confirm-delete flow
  AlertDialogAction, // the red "Delete" button inside the confirm box
  AlertDialogCancel, // the "Cancel" button — closes confirm without deleting
  AlertDialogContent, // the white box in the middle of the screen
  AlertDialogDescription, // the warning text under the title frted
  AlertDialogFooter, // bottom row where Cancel and Delete buttons sit
  AlertDialogHeader, // top part with title + description
  AlertDialogTitle, // bold "Delete patient?" heading
  AlertDialogTrigger, // wraps the Delete button that opens the confirm dialog
} from "@/components/ui/alert-dialog";

// Badge = small colored pill showing status (Inquiry, Active, etc.).
import { Badge } from "@/components/ui/badge";

// Button = clickable buttons (Edit patient, Delete patient).
import { Button } from "@/components/ui/button";

// Sheet pieces = the sliding panel that comes in from the right side of the screen.
import {
  Sheet, // root — knows if panel is open or closed
  SheetContent, // the actual panel body (white area with patient info)
  SheetDescription, // subtitle under the patient's name
  SheetHeader, // top section with title + description
  SheetTitle, // big name at top of panel
} from "@/components/ui/sheet";

// Helpers to make raw data look nice on screen (dates, names, colors).
import {
  formatDateOfBirth, // "1990-01-15" → "Jan 15, 1990"
  formatFullName, // first + middle + last → one string
  formatTimestamp, // Firestore time → "Jun 17, 2026, 3:45 PM"
  STATUS_BADGE_STYLES, // background/text color per status
} from "@/lib/patientFormat";

// Field config = the master list of labels and field order (same as the form).
import {
  patientFields, // array of every field — we loop this to show read-only detail
  patientToFormValues, // copies Firestore patient → form shape for edit mode
  type PatientFieldKey, // TypeScript type for keys like "firstName" or "address.city"
} from "@/lib/patientFields";

// Patient = full record from database; PatientFormValues = just what the form holds.
import type { Patient, PatientFormValues } from "@/lib/types";

// Service functions — the only way we talk to Firestore (save changes, delete record).
import { deletePatient, updatePatient } from "@/services/patients";

// ---------------------------------------------------------------------------
// PROPS — what PatientList passes IN when it opens this sheet
// ---------------------------------------------------------------------------

type PatientDetailSheetProps = {
  patient: Patient | null; // who we're looking at — null when sheet is closed
  open: boolean; // true = panel visible, false = hidden off-screen
  onOpenChange: (open: boolean) => void; // tell parent when user closes the panel
};

// ---------------------------------------------------------------------------
// HELPER — read-only display: turn one field key into text on the screen
// ---------------------------------------------------------------------------

/**
 * In read-only mode, turn one field key into text for the screen.
 * Uses the same field order as the form (patientFields).
 */
function getPatientFieldValue(
  patient: Patient,
  key: PatientFieldKey,
): string {
  // ADDRESS FIELDS live nested under patient.address (street, city, etc.)
  if (key.startsWith("address.")) {
    // Split "address.city" → ["address", "city"] — we want the second part.
    const subKey = key.split(".")[1] as keyof Patient["address"];
    const value = patient.address[subKey];
    // If empty, show a dash instead of blank space.
    return value ? String(value) : "—";
  }

  // DATE OF BIRTH gets formatted nicely instead of raw ISO string.
  if (key === "dateOfBirth") {
    return formatDateOfBirth(patient.dateOfBirth);
  }

  // SIMPLE TEXT FIELDS — pull straight off the patient object.
  if (key === "firstName") return patient.firstName;
  if (key === "middleName") return patient.middleName ?? "—"; // optional — old records may lack it
  if (key === "lastName") return patient.lastName;
  if (key === "gender") return patient.gender ?? "—";
  if (key === "status") return patient.status;

  // CLINICAL FIELDS — long text; only shown in detail, not in list table.
  if (key === "healthHistory") return patient.healthHistory ?? "—";
  if (key === "medicationHistory") return patient.medicationHistory ?? "—";

  // If we somehow get a key we don't recognize, show a dash.
  return "—";
}

// ---------------------------------------------------------------------------
// MAIN COMPONENT — the sliding detail panel
// ---------------------------------------------------------------------------

export function PatientDetailSheet({
  patient,
  open,
  onOpenChange,
}: PatientDetailSheetProps) {
  // Are we in edit mode (form showing) or view mode (read-only labels)?
  const [isEditing, setIsEditing] = useState(false);

  // True while "Save changes" is waiting on Firestore — disables buttons, shows "Saving…".
  const [isSubmitting, setIsSubmitting] = useState(false);

  // True while delete is in progress — disables Delete button, shows "Deleting…".
  const [isDeleting, setIsDeleting] = useState(false);

  // If save or delete failed, we store the error message string here to show in red.
  const [actionError, setActionError] = useState<string | null>(null);

  /**
   * Called when user closes the sheet (X, click outside, or after delete).
   * We tell the parent AND reset our local edit/error state.
   */
  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen); // let PatientList know open/closed

    if (!nextOpen) {
      // Sheet is closing — go back to view mode and forget any error.
      setIsEditing(false);
      setActionError(null);
    }
  }

  /**
   * User clicked "Save changes" in edit mode after the form validated.
   */
  async function handleUpdate(values: PatientFormValues) {
    // Safety check — shouldn't happen, but don't save if we lost the patient reference.
    if (!patient) {
      return;
    }

    setIsSubmitting(true); // lock the form — we're working
    setActionError(null); // clear old error from a previous failed save

    try {
      // Write to Firestore through the service layer (validates again there too).
      await updatePatient(patient.id, values);

      setIsEditing(false); // success — switch back to read-only view
      toast.success("Patient updated successfully"); // green corner message
    } catch (error) {
      // Build a readable message whether error is an Error object or something else.
      const message =
        error instanceof Error ? error.message : "Failed to update patient";
      setActionError(message); // red text inside the sheet
      toast.error(message); // red corner message too
    } finally {
      // Always turn off loading — even if save failed.
      setIsSubmitting(false);
    }
  }

  /**
   * User confirmed "Delete" in the alert dialog — remove patient from Firestore.
   */
  async function handleDelete() {
    if (!patient) {
      return;
    }

    setIsDeleting(true);
    setActionError(null);

    try {
      await deletePatient(patient.id); // permanent — no undo
      handleOpenChange(false); // close the sheet — that patient is gone from the list
      toast.success("Patient deleted successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete patient";
      setActionError(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  // If parent hasn't picked a patient yet, don't render anything (avoids crashes).
  if (!patient) {
    return null;
  }

  // Look up the pill colors for this patient's current status.
  const statusStyles = STATUS_BADGE_STYLES[patient.status];

  return (
    // Sheet root — controlled by open + handleOpenChange from props.
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        {/* ----- HEADER: patient name + subtitle ----- */}
        <SheetHeader>
          <SheetTitle>{formatFullName(patient)}</SheetTitle>
          <SheetDescription>Patient record details</SheetDescription>
        </SheetHeader>

        {/* ----- STATUS BADGE under the header ----- */}
        <div className="flex items-center gap-2 px-4">
          <Badge variant="outline" className="border-transparent" style={statusStyles}>
            {patient.status}
          </Badge>
        </div>

        {/* ----- BODY: either EDIT form OR read-only field list ----- */}
        {isEditing ? (
          // EDIT MODE — same PatientForm as Add Patient, but pre-filled with this record.
          <div className="px-4 pb-4">
            <PatientForm
              // key changes when Firestore updates — forces form to reload fresh data.
              key={`edit-${patient.id}-${patient.updatedAt?.seconds ?? 0}`}
              formId={`edit-patient-${patient.id}`}
              defaultValues={patientToFormValues(patient)} // copy DB → form fields
              onSubmit={handleUpdate}
              onCancel={() => setIsEditing(false)} // Cancel button inside form
              submitLabel="Save changes"
              isSubmitting={isSubmitting}
            />
          </div>
        ) : (
          // VIEW MODE — loop patientFields and show label + value for each.
          <div className="space-y-6 px-4 pb-4">
            <dl className="grid gap-4 sm:grid-cols-2">
              {patientFields.map((field) => (
                <div
                  key={field.key}
                  className={
                    // Textareas and street address span full width on larger screens.
                    field.inputType === "textarea" ||
                    field.key === "address.street" ||
                    field.key === "address.line2"
                      ? "sm:col-span-2"
                      : ""
                  }
                >
                  {/* dt = definition term = the gray label */}
                  <dt className="text-sm font-medium text-muted-foreground">
                    {field.label}
                  </dt>
                  {/* dd = definition description = the actual value */}
                  <dd
                    className={
                      field.inputType === "textarea"
                        ? "mt-1 whitespace-pre-wrap text-sm text-foreground" // preserve line breaks
                        : "mt-1 text-sm text-foreground"
                    }
                  >
                    {getPatientFieldValue(patient, field.key)}
                  </dd>
                </div>
              ))}
            </dl>

            {/* AUDIT SECTION — when record was created/updated (from Firestore, not the form) */}
            <dl className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Created</dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatTimestamp(patient.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Last updated</dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatTimestamp(patient.updatedAt)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">Last edited by</dt>
                <dd className="mt-1 text-sm text-foreground">
                  {patient.lastEditedBy ?? "—"}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {/* Red error line if save or delete failed */}
        {actionError ? (
          <p className="px-4 text-sm text-destructive">{actionError}</p>
        ) : null}

        {/* FOOTER BUTTONS — only in view mode (edit mode has its own Cancel/Save inside form) */}
        {!isEditing ? (
          <div className="mt-auto flex flex-wrap gap-2 border-t border-border p-4">
            <Button onClick={() => setIsEditing(true)}>Edit patient</Button>

            {/* Delete opens a second popup on top — must confirm before we call handleDelete */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  Delete patient
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete patient?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes {formatFullName(patient)} from the
                    dashboard. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => void handleDelete()}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting…" : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
