import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FieldType } from "@/types/form";
import { FieldRendererProps } from "../../types";
import styles from "./InputField.module.css";

const INPUT_TYPE_MAP: Partial<Record<FieldType, string>> = {
  email: "email",
  phone: "tel",
  number: "number",
  url: "url",
};

export default function InputField({
  field,
  control,
  error,
}: FieldRendererProps) {
  const isLongText = field.fieldType === "long_text";
  const inputType = INPUT_TYPE_MAP[field.fieldType] ?? "text";

  if (isLongText) {
    return (
      <Controller
        name={field.id}
        control={control}
        defaultValue=""
        render={({ field: f }) => (
          <textarea
            {...f}
            id={`field-${field.id}`}
            placeholder={`Enter ${field.label.toLowerCase()}…`}
            className={`${styles.textarea} ${error ? styles.inputError : ""}`}
            rows={4}
          />
        )}
      />
    );
  }

  return (
    <Controller
      name={field.id}
      control={control}
      defaultValue=""
      render={({ field: f }) => (
        <Input
          {...f}
          id={`field-${field.id}`}
          type={inputType}
          placeholder={`Enter ${field.label.toLowerCase()}…`}
          className={`${styles.input} ${error ? styles.inputError : ""}`}
          autoComplete="off"
          aria-invalid={!!error}
        />
      )}
    />
  );
}
