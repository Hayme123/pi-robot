import { writeFile } from "node:fs/promises";
import type { FastifyBaseLogger } from "fastify";
import { Node } from "./types.js";

const FIGMA_API = "https://api.figma.com/v1";
const RETRIES = 4;

/**
 * Retrieves one Figma node document.
 *
 * @param {string} fileKey - Figma file key.
 * @param {string} nodeId - Normalized Figma node ID.
 * @param {string} token - Figma personal access token.
 * @returns {Promise<Node>} Figma node document.
 * @throws {Error} If the API response does not contain a node.
 */
export async function getNode(fileKey: string, nodeId: string, token: string, log: FastifyBaseLogger): Promise<Node> {
  const response = await figmaFetch(`${FIGMA_API}/files/${fileKey}/nodes`, token, { ids: nodeId }, 180_000, log);
  const nodes = ((await response.json()) as { nodes?: Record<string, { document?: Node }> }).nodes ?? {};
  const node = nodes[nodeId] ?? nodes[nodeId.replaceAll(":", "-")] ?? Object.values(nodes)[0];
  if (!node?.document) throw new Error(`Node ${nodeId} was not found in Figma file ${fileKey}`);
  return node.document;
}

/**
 * Downloads a PNG reference image, falling back to smaller Figma render scales.
 *
 * @param {string} fileKey - Figma file key.
 * @param {string} nodeId - Figma node ID.
 * @param {string} token - Figma personal access token.
 * @param {string} outputPath - PNG destination path.
 * @returns {Promise<void>} Resolves when an image is written or unavailable.
 */
export async function downloadFrameImage(fileKey: string, nodeId: string, token: string, outputPath: string, log: FastifyBaseLogger): Promise<void> {
  for (const scale of ["2", "1", "0.5"]) {
    try {
      const response = await figmaFetch(`${FIGMA_API}/images/${fileKey}`, token, { ids: nodeId, format: "png", scale }, 180_000, log);
      const images = ((await response.json()) as { images?: Record<string, string | null> }).images ?? {};
      const imageUrl = images[nodeId] ?? images[nodeId.replaceAll(":", "-")] ?? Object.values(images).find(Boolean);
      if (!imageUrl) continue;
      const image = await fetch(imageUrl, { signal: AbortSignal.timeout(1_800_000) });
      if (!image.ok) throw new Error(`Image download failed: ${image.status}`);
      await writeFile(outputPath, Buffer.from(await image.arrayBuffer()));
      return;
    } catch (error) {
      if (scale === "0.5") throw error;
      log.warn({ error, nodeId, scale }, "Figma image download failed; retrying at a smaller scale");
    }
  }
}

/**
 * Fetches a Figma API resource with retry handling for transient failures.
 *
 * @param {string} url - Absolute Figma API URL.
 * @param {string} token - Figma personal access token.
 * @param {Record<string, string>} params - URL search parameters.
 * @param {number} timeoutMs - Request timeout in milliseconds.
 * @returns {Promise<Response>} Successful HTTP response.
 * @throws {Error} If every request attempt fails.
 */
async function figmaFetch(url: string, token: string, params: Record<string, string>, timeoutMs: number, log: FastifyBaseLogger): Promise<Response> {
  const target = new URL(url);
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);

  let failure: unknown;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      const response = await fetch(target, { headers: { "X-Figma-Token": token }, signal: AbortSignal.timeout(timeoutMs) });
      if (![429, 500, 502, 503, 504].includes(response.status) || attempt === RETRIES) {
        if (!response.ok) throw new Error(`Figma request failed: ${response.status} ${await response.text()}`);
        return response;
      }
      log.warn({ attempt, statusCode: response.status }, "Transient Figma response; retrying");
      await wait(Math.max(attempt * 2000, Number(response.headers.get("retry-after") ?? 0) * 1000));
    } catch (error) {
      failure = error;
      if (attempt < RETRIES) {
        log.warn({ attempt, error }, "Figma request failed; retrying");
        await wait(attempt * 2000);
      }
    }
  }
  throw failure instanceof Error ? failure : new Error("Figma request failed");
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
