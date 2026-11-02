"use client";
import { useState } from "react";
import { beginUpload, completeUpload } from "@/api/commerce";
import { getErrorMessage } from "@/lib/errors";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
];

const MAX_FILE_SIZE_BYTES = 10485760; // 10 MB

export function useRegistrationUpload(
  eventId: string,
  fieldId: string,
  onComplete: (value: string) => void,
) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");

  const reset = () => {
    setFilename("");
    setError("");
    setProgress(null);
    onComplete("");
  };

  const upload = async (file?: File) => {
    if (!file || busy) return;
    setBusy(true);
    setProgress(0);
    setError("");
    onComplete("");

    try {
      if (file.size === 0) {
        throw new Error("File is empty. Choose a file between 1 byte and 10 MB.");
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error("File size exceeds the 10 MB limit.");
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new Error(
          "Unsupported file type. Please upload a PDF, PNG, JPEG, or plain text file.",
        );
      }

      const signed = await beginUpload({
        eventId,
        fieldId,
        filename: file.name,
        size: file.size,
        contentType: file.type,
      });

      // Upload directly to Cloudflare R2 presigned URL with progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signed.url);
        xhr.setRequestHeader("Content-Type", file.type);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error("File upload failed. Please try again."));
          }
        };

        xhr.onerror = () => {
          reject(
            new Error("Network error during file upload. Please try again."),
          );
        };

        xhr.send(file);
      });

      const completed = await completeUpload(signed.id);
      onComplete(completed.value);
      setFilename(file.name);
      setProgress(100);
    } catch (err) {
      setError(getErrorMessage(err));
      setProgress(null);
    } finally {
      setBusy(false);
    }
  };

  return { upload, busy, progress, error, filename, reset };
}
