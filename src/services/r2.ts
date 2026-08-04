import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../config.js";

let client: S3Client | undefined;

function r2(): S3Client {
  return client ??= new S3Client({
    region: "auto",
    endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey },
  });
}

/**
 * Uploads an object to R2.
 *
 * @param {string} key - Object key.
 * @param {Buffer | Uint8Array | string} body - Object contents.
 * @param {string} contentType - MIME type.
 * @param {boolean} overwrite - Whether an existing object may be replaced.
 * @returns {Promise<void>} Resolves after upload.
 *
 * @example
 * await uploadObject("projects/site/files.json", "{}", "application/json", true);
 */
export async function uploadObject(key: string, body: Buffer | Uint8Array | string, contentType = "application/octet-stream", overwrite = false): Promise<void> {
  await r2().send(new PutObjectCommand({ Bucket: config.r2.bucket, Key: key, Body: body, ContentType: contentType, ...(!overwrite ? { IfNoneMatch: "*" } : {}) }));
}

/**
 * Downloads an R2 object into memory.
 *
 * @param {string} key - Object key.
 * @returns {Promise<Buffer>} Object contents.
 *
 * @example
 * await downloadObject("projects/site/workspace.zip");
 */
export async function downloadObject(key: string): Promise<Buffer> {
  const response = await r2().send(new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }));
  if (!response.Body) throw new Error(`R2 object has no body: ${key}`);
  return Buffer.from(await response.Body.transformToByteArray());
}

/**
 * Checks whether an R2 object exists.
 *
 * @param {string} key - Object key.
 * @returns {Promise<boolean>} Whether the object exists.
 *
 * @example
 * await objectExists("projects/site/files.json");
 */
export async function objectExists(key: string): Promise<boolean> {
  if (!config.r2.accountId || !config.r2.bucket || !config.r2.accessKeyId || !config.r2.secretAccessKey) return false;
  try {
    await r2().send(new HeadObjectCommand({ Bucket: config.r2.bucket, Key: key }));
    return true;
  } catch (error) {
    if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return false;
    throw error;
  }
}

/**
 * Creates a temporary attachment download URL for an R2 object.
 *
 * @param {string} key - Object key.
 * @param {string} filename - Download filename.
 * @returns {Promise<string>} Signed URL.
 *
 * @example
 * await signedDownloadUrl("projects/site/workspace.zip", "site.zip");
 */
export async function signedDownloadUrl(key: string, filename: string): Promise<string> {
  return getSignedUrl(r2(), new GetObjectCommand({
    Bucket: config.r2.bucket,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${filename.replace(/["\\]/g, "-")}"`,
  }), { expiresIn: config.r2.signedUrlTtlSeconds });
}
