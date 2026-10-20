"use client";
import { getUpload } from "@/api/commerce";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
export function useFileDownload() {
  return async (value: string) => {
    try {
      const { url, filename } = await getUpload(value.replace(/^file:/, ""));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.rel = "noopener noreferrer";
      link.click();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };
}
