import { useController } from "react-hook-form";
import { Upload, CheckCircle2, X } from "lucide-react";
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

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    upload.reset();
  };

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
        {input.value ? (
          <CheckCircle2
            size={20}
            style={{ color: "var(--status-success, #28a745)", flexShrink: 0 }}
          />
        ) : (
          <Upload size={20} className={styles.fileIcon} />
        )}
        <span className={styles.fileText}>
          <span className={styles.fileName}>
            {upload.busy
              ? `Uploading… ${upload.progress !== null ? `${upload.progress}%` : ""}`
              : upload.filename ||
                (input.value ? "File uploaded" : "Choose a file")}
          </span>
          <span className={styles.fileHint}>
            PDF, PNG, JPEG or plain text. Max 10 MB.
          </span>
        </span>
        {input.value && !upload.busy && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "none",
              borderRadius: "50%",
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255, 255, 255, 0.7)",
              cursor: "pointer",
              zIndex: 2,
            }}
            title="Remove file"
          >
            <X size={14} />
          </button>
        )}
      </label>
      {upload.error && (
        <p
          role="alert"
          style={{
            fontSize: "0.82rem",
            color: "var(--status-danger, #ff5050)",
            marginTop: "0.35rem",
          }}
        >
          {upload.error}
        </p>
      )}
    </div>
  );
}
