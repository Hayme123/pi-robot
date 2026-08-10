import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FastifyBaseLogger } from "fastify";

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export type AttachmentReference = {
  path: string;
  contentType: string;
  isImage: boolean;
};

/**
 * Downloads a frontend attachment into a project-owned reference directory.
 *
 * @param {string} url - HTTPS attachment URL.
 * @param {string} outputDir - Directory receiving the attachment.
 * @param {string} name - Safe base name for the downloaded file.
 * @param {FastifyBaseLogger} log - API logger.
 * @returns {Promise<AttachmentReference>} Local attachment metadata.
 */
export async function downloadAttachment(url: string, outputDir: string, name: string, log: FastifyBaseLogger): Promise<AttachmentReference> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw new Error("attachment_url must use HTTPS");

  const response = await fetch(parsed);
  if (!response.ok) throw new Error(`Attachment download failed: ${response.status}`);
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() || "application/octet-stream";
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_ATTACHMENT_BYTES) throw new Error("Attachment exceeds the 25 MB limit");

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_ATTACHMENT_BYTES) throw new Error("Attachment exceeds the 25 MB limit");

  const extension = extensionFor(contentType, parsed.pathname);
  const filePath = path.join(outputDir, `${safeName(name)}${extension}`);
  await mkdir(outputDir, { recursive: true });
  await writeFile(filePath, bytes);
  log.info({ attachmentName: safeName(name), contentType, size: bytes.byteLength }, "Attachment downloaded");
  return { path: filePath, contentType, isImage: contentType.startsWith("image/") };
}

/** Returns a safe filename base without path separators or control characters. */
function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "attachment";
}

/** Chooses a known extension from the response type or URL. */
function extensionFor(contentType: string, pathname: string): string {
  const known = new Map([
    ["image/png", ".png"], ["image/jpeg", ".jpg"], ["image/webp", ".webp"], ["image/gif", ".gif"],
    ["application/pdf", ".pdf"], ["text/plain", ".txt"], ["text/markdown", ".md"],
  ]);
  return known.get(contentType) || path.extname(pathname).replace(/[^a-zA-Z0-9.]/g, "") || ".bin";
}
