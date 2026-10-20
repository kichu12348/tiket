import {
  CopyObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { HttpError } from "../utils/errors";
export const ALLOWED_FILES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/plain",
];
function storage() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } =
    process.env;
  if (
    !R2_ACCOUNT_ID ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_BUCKET
  )
    throw new HttpError(503, "Registration file storage is not configured.");
  return {
    client: new S3Client({
      region: "auto",
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    }),
    bucket: R2_BUCKET,
  };
}
export async function presignUpload(
  key: string,
  contentType: string,
  size?: number,
) {
  const { client, bucket } = storage();
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ...(size !== undefined ? { ContentLength: size } : {}),
    }),
    { expiresIn: 300, signableHeaders: new Set(["content-type"]) },
  );
}
export async function getImageObject(key: string) {
  const { client, bucket } = storage();
  return client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}
export async function finalizeUpload(
  key: string,
  contentType: string,
  size: number,
) {
  const { client, bucket } = storage();
  const object = await client.send(
    new HeadObjectCommand({ Bucket: bucket, Key: key }),
  );
  if (
    object.ContentLength !== size ||
    object.ContentType !== contentType ||
    !object.ETag
  )
    throw new HttpError(400, "Uploaded file does not match the declared file.");
  const target = key.replace(/^staging\//, "registrations/");
  // Copy out of the writable presigned key so an old URL cannot change a submitted answer.
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: target,
      CopySource: `${bucket}/${key}`,
      CopySourceIfMatch: object.ETag,
      MetadataDirective: "REPLACE",
      ContentType: contentType,
      ContentDisposition: "attachment",
    }),
  );
  return target;
}
export async function downloadUpload(key: string) {
  const { client, bucket } = storage();
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: "attachment",
    }),
    { expiresIn: 60 },
  );
}
