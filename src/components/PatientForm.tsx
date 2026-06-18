/**
 * Reusable patient create/edit form.
 *
 * Renders fields from the shared patientFields config and validates with the
 * same Zod schema the service layer uses, giving inline errors before submit.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type FieldErrors } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  defaultPatientFormValues,
  patientFields,
  type PatientFieldConfig,
} from "@/lib/patientFields";
import { patientFormSchema, type PatientFormValues } from "@/lib/types";

type PatientFormProps = {
  formId?: string;
  defaultValues?: PatientFormValues;
  onSubmit: (values: PatientFormValues) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
};

/** Walk nested react-hook-form errors (e.g. address.state) using dot-path keys. */
function getFieldError(
  errors: FieldErrors<PatientFormValues>,
  key: string,
): string | undefined {
  const parts = key.split(".");
  let current: unknown = errors;

  for (const part of parts) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  if (current && typeof current === "object" && "message" in current) {
    return (current as { message?: string }).message;
  }

  return undefined;
}

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
  const fieldId = field.key.replace(".", "-");

  if (field.inputType === "select") {
    // Radix Select is not a native input — wire it through Controller instead of register.
    return (
      <Controller
        name={field.key as keyof PatientFormValues}
        control={control}
        render={({ field: controllerField }) => (
          <Select
            value={controllerField.value as string}
            onValueChange={controllerField.onChange}
          >
            <SelectTrigger
              id={fieldId}
              className="w-full"
              aria-invalid={!!error}
            >
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
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PatientFormValues>({
    // Same schema as patients.ts — UI and service share one validation definition.
    resolver: zodResolver(patientFormSchema),
    defaultValues,
  });

  return (
    <form
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      // Rely on Zod for validation messages instead of conflicting browser defaults.
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {patientFields.map((field) => {
          const error = getFieldError(errors, field.key);
          const fieldId = field.key.replace(".", "-");

          return (
            <div
              key={field.key}
              className={
                field.key === "address.street" || field.key === "address.line2"
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
