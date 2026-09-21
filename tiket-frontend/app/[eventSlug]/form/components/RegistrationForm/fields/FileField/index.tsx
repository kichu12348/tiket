import { Controller } from "react-hook-form";
import { Upload, FileText, CheckCircle2 } from "lucide-react";
import { FieldRendererProps } from "../../types";
import styles from "./FileField.module.css";

export default function FileField({ field, control, error }: FieldRendererProps) {
  return (
    <Controller
      name={field.id}
      control={control}
      defaultValue=""
      render={({ field: f }) => {
        const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const selectedFile = e.target.files?.[0];
          if (selectedFile) {
            // For now, store filename or data string
            f.onChange(selectedFile.name);
          }
        };

        const hasFile = Boolean(f.value);

        return (
          <label className={`${styles.fileDropzone} ${error ? styles.inputError : ""}`}>
            <input
              type="file"
              id={`field-${field.id}`}
              className={styles.hiddenInput}
              onChange={handleFileChange}
              aria-invalid={!!error}
            />

            {hasFile ? (
              <>
                <CheckCircle2 size={20} className={styles.fileIcon} style={{ color: "var(--status-success, #28a745)" }} />
                <div className={styles.fileText}>
                  <span className={styles.fileName}>{f.value}</span>
                  <span className={styles.fileHint}>File selected. Click to change.</span>
                </div>
              </>
            ) : (
              <>
                <Upload size={20} className={styles.fileIcon} />
                <div className={styles.fileText}>
                  <span className={styles.fileName}>Choose a file or drag & drop</span>
                  <span className={styles.fileHint}>PDF, PNG, JPG, or DOCX (Max 10MB)</span>
                </div>
              </>
            )}
          </label>
        );
      }}
    />
  );
}
