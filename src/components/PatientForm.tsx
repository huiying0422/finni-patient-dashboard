/**
 * Phase 3 — Shared create/edit form (React Hook Form + Zod)
 *
 * One form component for BOTH "add new patient" and "edit existing patient."
 * It reads the field list from patientFields.ts and draws inputs automatically.
 */
// ---------------------------------------------------------------------------
// IMPORTS — each line pulls in a tool this file needs
// ---------------------------------------------------------------------------

// zodResolver = connects Zod schema rules to React Hook Form validation.
import { zodResolver } from "@hookform/resolvers/zod";

// Controller = wrapper for fancy inputs (Select) that RHF can't register() directly.
// useForm = the form brain — tracks values, errors, submit.
// FieldErrors = TypeScript type for the errors object.
import { Controller, useForm, type FieldErrors } from "react-hook-form";

// Button = Save / Cancel at bottom of edit form.
import { Button } from "@/components/ui/button";

// Input = single-line text and date fields.
import { Input } from "@/components/ui/input";

// Label = accessible text above each field ("First name", etc.).
import { Label } from "@/components/ui/label";

// Select pieces = dropdown for gender and status.
import {
  Select, // root — holds selected value
  SelectContent, // floating list of options
  SelectItem, // one row in the list
  SelectTrigger, // the box you click to open the list
  SelectValue, // shows placeholder or selected label
} from "@/components/ui/select";

// Textarea = multi-line boxes for health/medication history.
import { Textarea } from "@/components/ui/textarea";

// patientFields = master list of what to draw; defaultPatientFormValues = blank add form.
import {
  defaultPatientFormValues,
  patientFields,
  type PatientFieldConfig,
} from "@/lib/patientFields";

// patientFormSchema = validation rules; PatientFormValues = TypeScript form type.
import { patientFormSchema, type PatientFormValues } from "@/lib/types";

// ---------------------------------------------------------------------------
// PROPS — what AddPatientDialog or PatientDetailSheet pass in
// ---------------------------------------------------------------------------

type PatientFormProps = {
  formId?: string; // lets a button outside the <form> submit it (add dialog footer)
  defaultValues?: PatientFormValues; // blank for add, pre-filled for edit
  onSubmit: (values: PatientFormValues) => void | Promise<void>; // called after validation passes
  onCancel?: () => void; // edit mode only — shows Cancel button
  submitLabel?: string; // "Save patient" vs "Save changes"
  isSubmitting?: boolean; // disables submit while Firestore write in progress
};

/**
 * Finds the error message for one field, even nested ones like address.zip.
 * React Hook Form nests errors: errors.address.zip.message
 */
function getFieldError(
  errors: FieldErrors<PatientFormValues>,
  key: string,
): string | undefined {
  // "address.zip" becomes ["address", "zip"] — we walk down one level at a time.
  const parts = key.split(".");
  let current: unknown = errors;

  for (const part of parts) {
    // If we ran out of object to walk into, there's no error here.
    if (!current || typeof current !== "object") {
      return undefined;
    }
    // Go one level deeper: errors → errors.address → errors.address.zip
    current = (current as Record<string, unknown>)[part];
  }

  // Zod puts the human message on a .message property.
  if (current && typeof current === "object" && "message" in current) {
    return (current as { message?: string }).message;
  }

  return undefined;
}

/**
 * Draws the actual input widget for ONE field based on its inputType.
 * Called inside the big loop over patientFields.
 */
function FieldControl({
  field,
  register,
  control,
  error,
}: {
  field: PatientFieldConfig;
  register: ReturnType<typeof useForm<PatientFormValues>>["register"];
  control: ReturnType<typeof useForm<PatientFormValues>>["control"];
  error?: string;
}) {
  // HTML id can't have dots — "address.street" becomes "address-street".
  const fieldId = field.key.replace(".", "-");

  // --- DROPDOWN (status, gender) ---
  if (field.inputType === "select") {
    return (
      <Controller
        name={field.key as keyof PatientFormValues}
        control={control}
        render={({ field: controllerField }) => (
          <Select
            // Empty string would confuse Radix — use undefined so placeholder shows.
            value={(controllerField.value as string) || undefined}
            onValueChange={controllerField.onChange}
          >
            <SelectTrigger id={fieldId} className="w-full" aria-invalid={!!error}>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    );
  }

  // --- BIG TEXT BOX (health / medication history) ---
  if (field.inputType === "textarea") {
    return (
      <Textarea
        id={fieldId}
        rows={4}
        aria-invalid={!!error}
        {...register(field.key as keyof PatientFormValues & string)}
      />
    );
  }

  // --- NORMAL TEXT OR DATE INPUT ---
  return (
    <Input
      id={fieldId}
      type={field.inputType}
      aria-invalid={!!error}
      autoComplete={field.autoComplete}
      maxLength={field.key === "address.state" ? 2 : undefined}
      {...register(field.key as keyof PatientFormValues & string)}
    />
  );
}

export function PatientForm({
  formId = "patient-form",
  defaultValues = defaultPatientFormValues,
  onSubmit,
  onCancel,
  submitLabel = "Save patient",
  isSubmitting = false,
}: PatientFormProps) {
  // useForm = React Hook Form's brain — tracks what's typed and what's invalid.
  const {
    register, // hook up simple inputs
    control, // hook up fancy inputs (Select)
    handleSubmit, // run validation then call onSubmit
    formState: { errors }, // Zod messages land here
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema), // same rules as patients.ts
    defaultValues, // blank for add, pre-filled for edit
  });

  return (
    <form
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate // we use Zod messages, not the browser's generic ones
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Loop: one box per field in patientFields — no copy-paste per field. */}
        {patientFields.map((field) => {
          const error = getFieldError(errors, field.key);
          const fieldId = field.key.replace(".", "-");

          return (
            <div
              key={field.key}
              className={
                // Wide fields span both columns on larger screens.
                field.inputType === "textarea" ||
                field.key === "address.street" ||
                field.key === "address.line2"
                  ? "sm:col-span-2"
                  : ""
              }
            >
              <Label htmlFor={fieldId}>
                {field.label}
                {field.optional ? (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    (optional)
                  </span>
                ) : null}
              </Label>

              {field.helperText ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {field.helperText}
                </p>
              ) : null}

              <div className="mt-1.5">
                <FieldControl
                  field={field}
                  register={register}
                  control={control}
                  error={error}
                />
              </div>

              {error ? (
                <p className="mt-1.5 text-sm text-destructive">{error}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Edit mode shows Cancel + Save inside the form; add mode uses dialog footer instead. */}
      {onCancel ? (
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : submitLabel}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
