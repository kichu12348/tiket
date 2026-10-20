"use client";
import { useState } from "react";
import { beginUpload, completeUpload } from "@/api/commerce";
import { getErrorMessage } from "@/lib/errors";
export function useRegistrationUpload(eventId: string, fieldId: string, onComplete: (value: string) => void) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [filename, setFilename] = useState("");
  const upload = async (file?: File) => {
    if (!file || busy) return; setBusy(true); setError(""); onComplete("");
    try {
      if (file.size > 10485760 || file.size === 0) throw new Error("Choose a file between 1 byte and 10 MB.");
      if (!["application/pdf", "image/png", "image/jpeg", "text/plain"].includes(file.type)) throw new Error("Use a PDF, PNG, JPEG or plain text file.");
      const signed = await beginUpload({ eventId, fieldId, filename: file.name, size: file.size, contentType: file.type });
      // The presigned storage URL deliberately bypasses the authenticated API client.
      const response = await fetch(signed.url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!response.ok) throw new Error("File upload failed. Please try again.");
      const completed = await completeUpload(signed.id); onComplete(completed.value); setFilename(file.name);
    } catch (err) { setError(getErrorMessage(err)); } finally { setBusy(false); }
  };
  return { upload, busy, error, filename };
}
