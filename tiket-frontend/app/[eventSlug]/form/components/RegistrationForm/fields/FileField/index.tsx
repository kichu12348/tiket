import { useController } from "react-hook-form";
import { Upload, CheckCircle2 } from "lucide-react";
import type { FieldRendererProps } from "../../types";
import { useRegistrationUpload } from "@/hooks/useRegistrationUpload";
import styles from "./FileField.module.css";
export default function FileField({
  field,
  control,
  error,
}: FieldRendererProps) {
  const { field: input } = useController({
    name: field.id,
    control,
    defaultValue: "",
  });
  const upload = useRegistrationUpload(field.eventId, field.id, input.onChange);
  return (
    <div>
      <label
        className={`${styles.fileDropzone} ${error ? styles.inputError : ""}`}
      >
        <input
          type="file"
          id={`field-${field.id}`}
          className={styles.hiddenInput}
          disabled={upload.busy}
          accept=".pdf,.png,.jpg,.jpeg,.txt"
          onChange={(event) => {
            void upload.upload(event.target.files?.[0]);
          }}
          aria-invalid={Boolean(error)}
        />
        {input.value ? <CheckCircle2 size={20} /> : <Upload size={20} />}
        <span className={styles.fileText}>
          <span className={styles.fileName}>
            {upload.busy ? "Uploading…" : upload.filename || "Choose a file"}
          </span>
          <span className={styles.fileHint}>
            PDF, PNG, JPEG or plain text. Max 10 MB.
          </span>
        </span>
      </label>
      {upload.error && <p role="alert">{upload.error}</p>}
    </div>
  );
}
