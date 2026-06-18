import { useState } from "react";
import type { Timestamp } from "firebase/firestore";
import { toast } from "sonner";

import { PatientForm } from "@/components/PatientForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  patientFields,
  patientToFormValues,
  type PatientFieldKey,
} from "@/lib/patientFields";
import type { Patient, PatientFormValues } from "@/lib/types";
import { deletePatient, updatePatient } from "@/services/patients";

type PatientDetailSheetProps = {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const STATUS_BADGE_STYLES: Record<
  PatientFormValues["status"],
  { backgroundColor: string; color: string }
> = {
  Inquiry: { backgroundColor: "#D1BCE7", color: "#4A3A54" },
  Onboarding: { backgroundColor: "#FDE7D6", color: "#B8480F" },
  Active: { backgroundColor: "#E2F3E7", color: "#2E7D3A" },
  Churned: { backgroundColor: "#E6E6E6", color: "#758696" },
};

function formatFullName(patient: Patient): string {
  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ");
}

function formatDateOfBirth(dateOfBirth: string): string {
  const parsed = new Date(dateOfBirth);
  if (Number.isNaN(parsed.getTime())) {
    return dateOfBirth;
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTimestamp(timestamp: Timestamp | undefined): string {
  if (!timestamp || typeof timestamp.toDate !== "function") {
    return "—";
  }

  return timestamp.toDate().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getPatientFieldValue(
  patient: Patient,
  key: PatientFieldKey,
): string {
  if (key.startsWith("address.")) {
    const subKey = key.split(".")[1] as keyof Patient["address"];
    const value = patient.address[subKey];
    return value ? String(value) : "—";
  }

  if (key === "dateOfBirth") {
    return formatDateOfBirth(patient.dateOfBirth);
  }

  if (key === "firstName") return patient.firstName;
  if (key === "middleName") return patient.middleName ?? "—";
  if (key === "lastName") return patient.lastName;
  if (key === "status") return patient.status;

  return "—";
}

export function PatientDetailSheet({
  patient,
  open,
  onOpenChange,
}: PatientDetailSheetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setIsEditing(false);
      setActionError(null);
    }
  }

  async function handleUpdate(values: PatientFormValues) {
    if (!patient) {
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      await updatePatient(patient.id, values);
      setIsEditing(false);
      toast.success("Patient updated successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update patient";
      setActionError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!patient) {
      return;
    }

    setIsDeleting(true);
    setActionError(null);

    try {
      await deletePatient(patient.id);
      handleOpenChange(false);
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

  if (!patient) {
    return null;
  }

  const statusStyles = STATUS_BADGE_STYLES[patient.status];

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{formatFullName(patient)}</SheetTitle>
          <SheetDescription>Patient record details</SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-2 px-4">
          <Badge
            variant="outline"
            className="border-transparent"
            style={statusStyles}
          >
            {patient.status}
          </Badge>
        </div>

        {isEditing ? (
          <div className="px-4 pb-4">
            <PatientForm
              key={`edit-${patient.id}-${patient.updatedAt?.seconds ?? 0}`}
              formId={`edit-patient-${patient.id}`}
              defaultValues={patientToFormValues(patient)}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditing(false)}
              submitLabel="Save changes"
              isSubmitting={isSubmitting}
            />
          </div>
        ) : (
          <div className="space-y-6 px-4 pb-4">
            <dl className="grid gap-4 sm:grid-cols-2">
              {patientFields.map((field) => (
                <div
                  key={field.key}
                  className={
                    field.key === "address.street" || field.key === "address.line2"
                      ? "sm:col-span-2"
                      : ""
                  }
                >
                  <dt className="text-sm font-medium text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {getPatientFieldValue(patient, field.key)}
                  </dd>
                </div>
              ))}
            </dl>

            <dl className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Created
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatTimestamp(patient.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Last updated
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatTimestamp(patient.updatedAt)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">
                  Last edited by
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {patient.lastEditedBy ?? "—"}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {actionError ? (
          <p className="px-4 text-sm text-destructive">{actionError}</p>
        ) : null}

        {!isEditing ? (
          <div className="mt-auto flex flex-wrap gap-2 border-t border-border p-4">
            <Button onClick={() => setIsEditing(true)}>Edit patient</Button>
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
