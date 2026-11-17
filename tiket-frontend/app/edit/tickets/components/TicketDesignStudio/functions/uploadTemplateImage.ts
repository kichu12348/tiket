import { getSignedUrl, uploadToCDN } from "@/api/events";
import { getImageUrl } from "@/constants/config";

/**
 * Uploads a local template image file to CDN via presigned S3/MinIO URL.
 */
export async function uploadTemplateImage(
  file: File,
  eventId: string,
): Promise<string> {
  const {
    url,
    filename: cdnUrl,
    fileUrl,
  } = await getSignedUrl(file.name, file.type, {
    eventId,
    objType: "ticket-template",
  });

  const { filename } = await uploadToCDN(url, file, fileUrl || cdnUrl);
  return getImageUrl(filename || "");
}
